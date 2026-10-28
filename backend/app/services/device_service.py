from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.device import Device, Reader, DeviceStatus, ReaderStatus
from app.models.rack import Rack
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.schemas.device import HeartbeatRequest, HeartbeatResponse
from app.websocket.manager import ws_manager
from app.core.config import settings

class DeviceService:
    @staticmethod
    async def process_heartbeat(db: Session, hb: HeartbeatRequest) -> HeartbeatResponse:
        device = db.query(Device).filter(Device.device_id == hb.device_id).first()
        if not device:
            device = Device(
                device_id=hb.device_id,
                type="ESP8266",
                status=DeviceStatus.ONLINE,
                ip_address=hb.ip_address,
                last_heartbeat=datetime.now(timezone.utc),
                firmware_version=hb.firmware_version or "1.0.0",
                uptime_seconds=hb.uptime_seconds or 0
            )
            db.add(device)
            db.flush()
        else:
            device.status = DeviceStatus.ONLINE
            device.last_heartbeat = datetime.now(timezone.utc)
            if hb.ip_address:
                device.ip_address = hb.ip_address
            if hb.firmware_version:
                device.firmware_version = hb.firmware_version
            if hb.uptime_seconds:
                device.uptime_seconds = hb.uptime_seconds

        # Reader update
        reader_id = hb.reader_id or "RC522-01"
        reader = db.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            rack = db.query(Rack).filter(Rack.rack_code == "A1").first()
            if not rack:
                rack = Rack(rack_code="A1", name="Rack A1")
                db.add(rack)
                db.flush()
            reader = Reader(
                reader_id=reader_id,
                device_id=device.device_id,
                rack_id=rack.id,
                status=ReaderStatus.CONNECTED,
                last_seen=datetime.now(timezone.utc)
            )
            db.add(reader)
        else:
            reader.status = ReaderStatus.CONNECTED
            reader.last_seen = datetime.now(timezone.utc)

        # Resolve any open DEVICE_OFFLINE alerts for this device
        open_offline_alerts = db.query(Alert).filter(
            Alert.related_device_id == device.device_id,
            Alert.type == AlertType.DEVICE_OFFLINE,
            Alert.status == AlertStatus.UNRESOLVED
        ).all()
        for al in open_offline_alerts:
            al.status = AlertStatus.RESOLVED
            al.resolved_at = datetime.now(timezone.utc)

        db.commit()

        # Broadcast live heartbeat
        await ws_manager.broadcast("DEVICE_HEARTBEAT", {
            "device_id": device.device_id,
            "status": device.status.value,
            "ip_address": device.ip_address,
            "last_heartbeat": str(device.last_heartbeat),
            "firmware_version": device.firmware_version,
            "uptime_seconds": device.uptime_seconds
        })

        return HeartbeatResponse(
            status="ok",
            server_time=datetime.now(timezone.utc),
            device_id=device.device_id,
            device_status=device.status
        )

    @staticmethod
    async def check_device_timeouts(db: Session):
        """Find devices whose last heartbeat exceeds the configured timeout."""
        threshold = datetime.now(timezone.utc) - timedelta(seconds=settings.DEVICE_OFFLINE_TIMEOUT_SECONDS)
        
        devices = db.query(Device).filter(
            Device.status == DeviceStatus.ONLINE,
            (Device.last_heartbeat == None) | (Device.last_heartbeat < threshold)
        ).all()

        for d in devices:
            d.status = DeviceStatus.OFFLINE
            # Disconnect associated readers
            for r in d.readers:
                r.status = ReaderStatus.DISCONNECTED

            # Check if alert already active
            existing_alert = db.query(Alert).filter(
                Alert.related_device_id == d.device_id,
                Alert.type == AlertType.DEVICE_OFFLINE,
                Alert.status == AlertStatus.UNRESOLVED
            ).first()

            if not existing_alert:
                alert = Alert(
                    type=AlertType.DEVICE_OFFLINE,
                    severity=AlertSeverity.CRITICAL,
                    message=f"Device Offline Alert: IoT Hub '{d.device_id}' has missed heartbeats (> {settings.DEVICE_OFFLINE_TIMEOUT_SECONDS}s). Reader communication suspended.",
                    related_device_id=d.device_id,
                    status=AlertStatus.UNRESOLVED,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(alert)
                db.flush()

                await ws_manager.broadcast("ALERT_TRIGGERED", {
                    "id": alert.id,
                    "type": alert.type.value,
                    "severity": alert.severity.value,
                    "message": alert.message,
                    "created_at": str(alert.created_at)
                })

            await ws_manager.broadcast("DEVICE_OFFLINE", {
                "device_id": d.device_id,
                "status": "OFFLINE",
                "last_heartbeat": str(d.last_heartbeat) if d.last_heartbeat else None
            })

        db.commit()

    @staticmethod
    def list_devices(db: Session) -> List[Device]:
        return db.query(Device).all()

    @staticmethod
    def get_device(db: Session, device_id: str) -> Optional[Device]:
        return db.query(Device).filter(Device.device_id == device_id).first()

device_service = DeviceService()

import time
from typing import Dict, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.rfid_tag import RFIDTag, TagStatus
from app.models.device import Device, Reader, DeviceStatus, ReaderStatus
from app.models.rack import Rack
from app.models.rfid_event import RFIDEvent, RFIDEventType
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.schemas.rfid_event import RFIDEventCreate
from app.websocket.manager import ws_manager
from app.core.config import settings

def normalize_uid(uid: str) -> str:
    return uid.replace(" ", "").replace("-", "").replace(":", "").upper().strip()

class IoTService:
    def __init__(self):
        # Debounce cache: key = (device_id, reader_id, normalized_uid) -> timestamp
        self._debounce_cache: Dict[Tuple[str, str, str], float] = {}

    def is_debounced(self, device_id: str, reader_id: str, uid: str) -> bool:
        key = (device_id, reader_id, uid)
        now = time.time()
        last_time = self._debounce_cache.get(key)
        if last_time and (now - last_time < settings.RFID_DEBOUNCE_SECONDS):
            return True
        self._debounce_cache[key] = now
        return False

    async def process_rfid_scan(self, db: Session, payload: RFIDEventCreate) -> Dict:
        norm_uid = normalize_uid(payload.rfid_uid)

        if not norm_uid or len(norm_uid) < 4:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid RFID UID format.")

        # Debounce check
        if self.is_debounced(payload.device_id, payload.reader_id, norm_uid):
            return {
                "status": "ignored_debounce",
                "message": f"Scan for UID {norm_uid} debounced (within {settings.RFID_DEBOUNCE_SECONDS}s window)",
                "rfid_uid": norm_uid
            }

        # Validate or ensure device exists
        device = db.query(Device).filter(Device.device_id == payload.device_id).first()
        if not device:
            device = Device(
                device_id=payload.device_id,
                type="ESP8266",
                status=DeviceStatus.ONLINE,
                last_heartbeat=datetime.now(timezone.utc)
            )
            db.add(device)
            db.flush()
        else:
            device.status = DeviceStatus.ONLINE

        # Validate or ensure reader exists
        reader = db.query(Reader).filter(Reader.reader_id == payload.reader_id).first()
        rack = None
        if not reader:
            # Default to rack A1
            rack = db.query(Rack).filter(Rack.rack_code == "A1").first()
            if not rack:
                rack = Rack(rack_code="A1", name="Rack A1")
                db.add(rack)
                db.flush()
            reader = Reader(
                reader_id=payload.reader_id,
                device_id=device.device_id,
                rack_id=rack.id,
                status=ReaderStatus.CONNECTED,
                last_seen=datetime.now(timezone.utc)
            )
            db.add(reader)
            db.flush()
        else:
            reader.last_seen = datetime.now(timezone.utc)
            reader.status = ReaderStatus.CONNECTED
            rack = reader.rack

        # Lookup registered product for this RFID UID
        tag = db.query(RFIDTag).filter(
            RFIDTag.uid == norm_uid,
            RFIDTag.status == TagStatus.ACTIVE
        ).first()

        product = tag.product if tag else None
        event_type = RFIDEventType.DETECTED if product else RFIDEventType.UNKNOWN

        # Record RFID Event
        event = RFIDEvent(
            uid=norm_uid,
            product_id=product.id if product else None,
            reader_id=payload.reader_id,
            device_id=payload.device_id,
            rack_id=rack.id if rack else None,
            event_type=event_type,
            source=payload.source or "ESP8266-01",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(event)

        # Handle Unknown Tag Alert
        alert_obj = None
        if not product:
            alert_obj = Alert(
                type=AlertType.UNKNOWN_RFID,
                severity=AlertSeverity.WARNING,
                message=f"Unknown RFID tag '{norm_uid}' detected on Reader {payload.reader_id} (Rack {rack.rack_code if rack else 'A1'}). Tag is not registered in product catalog.",
                related_device_id=payload.device_id,
                status=AlertStatus.UNRESOLVED,
                created_at=datetime.now(timezone.utc)
            )
            db.add(alert_obj)

        db.commit()
        db.refresh(event)

        # Broadcast via WebSocket
        ws_payload = {
            "event_id": event.id,
            "uid": norm_uid,
            "event_type": event.event_type.value,
            "product_id": product.id if product else None,
            "product_code": product.product_id if product else None,
            "product_name": product.name if product else "Unknown / Unregistered Product",
            "reader_id": payload.reader_id,
            "device_id": payload.device_id,
            "rack_code": rack.rack_code if rack else "A1",
            "source": event.source,
            "timestamp": str(event.timestamp)
        }
        await ws_manager.broadcast("RFID_DETECTED", ws_payload)

        if alert_obj:
            await ws_manager.broadcast("ALERT_TRIGGERED", {
                "id": alert_obj.id,
                "type": alert_obj.type.value,
                "severity": alert_obj.severity.value,
                "message": alert_obj.message,
                "created_at": str(alert_obj.created_at)
            })

        return {
            "status": "success",
            "event_id": event.id,
            "event_type": event.event_type.value,
            "uid": norm_uid,
            "product_id": product.id if product else None,
            "product_code": product.product_id if product else None,
            "product_name": product.name if product else None,
            "rack": rack.rack_code if rack else "A1"
        }

iot_service = IoTService()

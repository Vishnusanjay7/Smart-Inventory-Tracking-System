from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.device import Device
from app.schemas.device import DeviceResponse, ReaderResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[DeviceResponse])
def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    devices = db.query(Device).all()
    results = []
    for d in devices:
        readers = []
        for r in d.readers:
            readers.append(ReaderResponse(
                id=r.id,
                reader_id=r.reader_id,
                device_id=r.device_id,
                rack_id=r.rack_id,
                rack_code=r.rack.rack_code if r.rack else None,
                status=r.status,
                last_seen=r.last_seen
            ))
        results.append(DeviceResponse(
            id=d.id,
            device_id=d.device_id,
            type=d.type,
            status=d.status,
            ip_address=d.ip_address,
            last_heartbeat=d.last_heartbeat,
            firmware_version=d.firmware_version,
            uptime_seconds=d.uptime_seconds,
            readers=readers
        ))
    return results

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    d = db.query(Device).filter(Device.device_id == device_id).first()
    if not d:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    readers = []
    for r in d.readers:
        readers.append(ReaderResponse(
            id=r.id,
            reader_id=r.reader_id,
            device_id=r.device_id,
            rack_id=r.rack_id,
            rack_code=r.rack.rack_code if r.rack else None,
            status=r.status,
            last_seen=r.last_seen
        ))
    return DeviceResponse(
        id=d.id,
        device_id=d.device_id,
        type=d.type,
        status=d.status,
        ip_address=d.ip_address,
        last_heartbeat=d.last_heartbeat,
        firmware_version=d.firmware_version,
        uptime_seconds=d.uptime_seconds,
        readers=readers
    )

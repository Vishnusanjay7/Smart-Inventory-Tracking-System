from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.rfid_event import RFIDEventCreate
from app.schemas.device import HeartbeatRequest, HeartbeatResponse
from app.services.iot_service import iot_service
from app.services.device_service import device_service
from app.api.deps import validate_device_api_key

router = APIRouter()

@router.post("/rfid", status_code=status.HTTP_200_OK)
async def handle_iot_rfid_scan(
    payload: RFIDEventCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(validate_device_api_key)
):
    """
    Hardware endpoint called by ESP8266 when RC522 detects an RFID tag.
    Requires header: X-Device-API-Key
    """
    payload.source = payload.source or payload.device_id or "ESP8266-01"
    result = await iot_service.process_rfid_scan(db, payload)
    return result

@router.post("/heartbeat", response_model=HeartbeatResponse)
async def handle_iot_heartbeat(
    payload: HeartbeatRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(validate_device_api_key)
):
    """
    Hardware endpoint called by ESP8266 periodically for health monitoring.
    Requires header: X-Device-API-Key
    """
    return await device_service.process_heartbeat(db, payload)

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.simulator import SimulatorScanRequest
from app.schemas.rfid_event import RFIDEventCreate
from app.services.iot_service import iot_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/scan", status_code=status.HTTP_200_OK)
async def simulate_rfid_scan(
    payload: SimulatorScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Development simulator scan endpoint.
    Explicitly labeled DEVELOPMENT_SIMULATOR to test dashboard reactions,
    tag lookups, and alerts without physical hardware.
    """
    event_payload = RFIDEventCreate(
        device_id=payload.device_id,
        reader_id=payload.reader_id,
        rfid_uid=payload.rfid_uid,
        source="DEVELOPMENT_SIMULATOR" # Always marked explicitly
    )
    result = await iot_service.process_rfid_scan(db, event_payload)
    return {
        "status": "success",
        "simulator": True,
        "source": "DEVELOPMENT_SIMULATOR",
        "details": result
    }

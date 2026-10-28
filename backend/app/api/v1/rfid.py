from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.rfid_tag import RFIDTag, TagStatus
from app.models.rfid_event import RFIDEvent
from app.schemas.rfid_tag import RFIDTagResponse
from app.schemas.rfid_event import RFIDEventResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/tags", response_model=List[RFIDTagResponse])
def list_rfid_tags(
    status: Optional[TagStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RFIDTag)
    if status:
        query = query.filter(RFIDTag.status == status)

    tags = query.offset(skip).limit(limit).all()
    results = []
    for t in tags:
        p = t.product
        results.append(RFIDTagResponse(
            id=t.id,
            uid=t.uid,
            product_id=t.product_id,
            status=t.status,
            assigned_at=t.assigned_at,
            unassigned_at=t.unassigned_at,
            product_name=p.name if p else None,
            product_code=p.product_id if p else None
        ))
    return results

@router.get("/events", response_model=List[RFIDEventResponse])
def list_rfid_events(
    device_id: Optional[str] = Query(None),
    reader_id: Optional[str] = Query(None),
    uid: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RFIDEvent)
    if device_id:
        query = query.filter(RFIDEvent.device_id == device_id)
    if reader_id:
        query = query.filter(RFIDEvent.reader_id == reader_id)
    if uid:
        query = query.filter(RFIDEvent.uid == uid.upper().replace(" ", ""))

    events = query.order_by(desc(RFIDEvent.timestamp)).offset(skip).limit(limit).all()
    results = []
    for ev in events:
        p = ev.product
        r = ev.rack
        results.append(RFIDEventResponse(
            id=ev.id,
            uid=ev.uid,
            product_id=ev.product_id,
            product_code=p.product_id if p else None,
            product_name=p.name if p else None,
            reader_id=ev.reader_id,
            device_id=ev.device_id,
            rack_id=ev.rack_id,
            rack_code=r.rack_code if r else None,
            event_type=ev.event_type,
            source=ev.source,
            timestamp=ev.timestamp
        ))
    return results

@router.get("/tags/{uid}", response_model=RFIDTagResponse)
def get_tag_by_uid(
    uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    norm_uid = uid.replace(" ", "").replace("-", "").upper()
    tag = db.query(RFIDTag).filter(RFIDTag.uid == norm_uid).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"RFID UID '{norm_uid}' not found in registry.")

    p = tag.product
    return RFIDTagResponse(
        id=tag.id,
        uid=tag.uid,
        product_id=tag.product_id,
        status=tag.status,
        assigned_at=tag.assigned_at,
        unassigned_at=tag.unassigned_at,
        product_name=p.name if p else None,
        product_code=p.product_id if p else None
    )

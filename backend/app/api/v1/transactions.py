from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.transaction import InventoryTransaction, TransactionType
from app.models.rfid_tag import RFIDTag, TagStatus
from app.schemas.transaction import TransactionResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    product_id: Optional[int] = Query(None),
    rack_id: Optional[int] = Query(None),
    type: Optional[TransactionType] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryTransaction)

    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)
    if rack_id:
        query = query.filter(InventoryTransaction.rack_id == rack_id)
    if type:
        query = query.filter(InventoryTransaction.type == type)
    if user_id:
        query = query.filter(InventoryTransaction.user_id == user_id)
    if start_date:
        query = query.filter(InventoryTransaction.created_at >= start_date)
    if end_date:
        query = query.filter(InventoryTransaction.created_at <= end_date)

    txs = query.order_by(desc(InventoryTransaction.created_at)).offset(skip).limit(limit).all()
    results = []

    for tx in txs:
        p = tx.product
        r = tx.rack
        u = tx.user

        # Get RFID tag for product if exists
        tag = db.query(RFIDTag).filter(
            RFIDTag.product_id == p.id,
            RFIDTag.status == TagStatus.ACTIVE
        ).first()

        results.append(TransactionResponse(
            id=tx.id,
            product_id=p.id,
            product_code=p.product_id,
            product_name=p.name,
            rfid_uid=tag.uid if tag else None,
            rack_id=r.id,
            rack_code=r.rack_code,
            type=tx.type,
            quantity_change=tx.quantity_change,
            previous_quantity=tx.previous_quantity,
            new_quantity=tx.new_quantity,
            reason=tx.reason,
            user_id=tx.user_id,
            user_name=u.name if u else "System",
            created_at=tx.created_at
        ))

    return results

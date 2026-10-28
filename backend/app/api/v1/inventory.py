from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.inventory import InventoryResponse, InventoryOperationRequest
from app.schemas.transaction import TransactionResponse
from app.services.inventory_service import inventory_service
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[InventoryResponse])
def get_inventory(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    rack_id: Optional[int] = Query(None),
    stock_status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return inventory_service.get_inventory_list(
        db, search=search, category_id=category_id,
        rack_id=rack_id, stock_status=stock_status,
        skip=skip, limit=limit
    )

@router.post("/{product_id}/operation", response_model=TransactionResponse)
async def perform_inventory_operation(
    product_id: int,
    op: InventoryOperationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]))
):
    tx = await inventory_service.perform_operation(
        db=db,
        product_id=product_id,
        op=op,
        user_id=current_user.id,
        user_name=current_user.name
    )
    p = tx.product
    r = tx.rack
    return TransactionResponse(
        id=tx.id,
        product_id=p.id,
        product_code=p.product_id,
        product_name=p.name,
        rack_id=r.id,
        rack_code=r.rack_code,
        type=tx.type,
        quantity_change=tx.quantity_change,
        previous_quantity=tx.previous_quantity,
        new_quantity=tx.new_quantity,
        reason=tx.reason,
        user_id=current_user.id,
        user_name=current_user.name,
        created_at=tx.created_at
    )

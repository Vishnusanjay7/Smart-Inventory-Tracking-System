from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductDetailResponse,
    ProductAssignRfid,
    ProductReassignRfid
)
from app.schemas.rfid_tag import RFIDTagResponse
from app.services.product_service import product_service
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.get("", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    rack_id: Optional[int] = Query(None),
    stock_status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.list_products(
        db, search=search, category_id=category_id, rack_id=rack_id,
        stock_status=stock_status, skip=skip, limit=limit
    )

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))
):
    p = product_service.create_product(db, product_in, user_id=current_user.id)
    return product_service.get_product_details(db, p.id)

@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.get_product_details(db, product_id)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))
):
    p = product_service.update_product(db, product_id, product_in)
    return product_service.get_product_details(db, p.id)

@router.post("/{product_id}/assign-rfid", response_model=RFIDTagResponse)
def assign_rfid(
    product_id: int,
    payload: ProductAssignRfid,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]))
):
    tag = product_service.assign_rfid(db, product_id, payload.rfid_uid)
    return RFIDTagResponse(
        id=tag.id,
        uid=tag.uid,
        product_id=tag.product_id,
        status=tag.status,
        assigned_at=tag.assigned_at,
        unassigned_at=tag.unassigned_at,
        product_name=tag.product.name if tag.product else None,
        product_code=tag.product.product_id if tag.product else None
    )

@router.post("/{product_id}/reassign-rfid", response_model=RFIDTagResponse)
def reassign_rfid(
    product_id: int,
    payload: ProductReassignRfid,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))
):
    tag = product_service.reassign_rfid(db, product_id, payload.rfid_uid, confirm=payload.confirm)
    return RFIDTagResponse(
        id=tag.id,
        uid=tag.uid,
        product_id=tag.product_id,
        status=tag.status,
        assigned_at=tag.assigned_at,
        unassigned_at=tag.unassigned_at,
        product_name=tag.product.name if tag.product else None,
        product_code=tag.product.product_id if tag.product else None
    )

@router.post("/{product_id}/unassign-rfid")
def unassign_rfid(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))
):
    product_service.unassign_rfid(db, product_id)
    return {"status": "success", "message": "RFID tag unassigned successfully"}

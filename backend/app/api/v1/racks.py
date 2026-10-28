from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.rack import Rack, RackStatus
from app.models.inventory import Inventory
from app.models.product import Product
from app.schemas.rack import RackResponse, RackCreate
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()

@router.get("", response_model=List[RackResponse])
def list_racks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Rack).all()

@router.post("", response_model=RackResponse)
def create_rack(
    rack_in: RackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MANAGER]))
):
    existing = db.query(Rack).filter(Rack.rack_code == rack_in.rack_code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Rack code '{rack_in.rack_code}' already exists.")
    
    r = Rack(
        rack_code=rack_in.rack_code.upper().strip(),
        name=rack_in.name.strip(),
        description=rack_in.description,
        status=rack_in.status
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

@router.get("/{rack_code}/details")
def get_rack_details(
    rack_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rack = db.query(Rack).filter(Rack.rack_code == rack_code.upper()).first()
    if not rack:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rack not found")

    # Readers on this rack
    readers = []
    for r in rack.readers:
        readers.append({
            "reader_id": r.reader_id,
            "device_id": r.device_id,
            "device_status": r.device.status if r.device else "OFFLINE",
            "device_ip": r.device.ip_address if r.device else None,
            "status": r.status,
            "last_seen": r.last_seen
        })

    # Products on this rack
    inv_items = db.query(Inventory).filter(Inventory.rack_id == rack.id).all()
    products = []
    for inv in inv_items:
        p = inv.product
        products.append({
            "product_id": p.id,
            "product_code": p.product_id,
            "name": p.name,
            "category": p.category.name if p.category else None,
            "quantity": inv.quantity,
            "minimum_stock": p.minimum_stock,
            "updated_at": inv.updated_at
        })

    return {
        "id": rack.id,
        "rack_code": rack.rack_code,
        "name": rack.name,
        "status": rack.status,
        "description": rack.description,
        "readers": readers,
        "products": products,
        "total_items_count": len(products),
        "total_stock_units": sum(item["quantity"] for item in products)
    }

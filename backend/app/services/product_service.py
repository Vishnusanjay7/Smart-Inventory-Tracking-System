from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.category import Category
from app.models.rfid_tag import RFIDTag, TagStatus
from app.models.rack import Rack
from app.models.inventory import Inventory
from app.models.transaction import InventoryTransaction, TransactionType
from app.models.rfid_event import RFIDEvent
from app.schemas.product import ProductCreate, ProductUpdate
from app.core.config import settings

def normalize_uid(uid: str) -> str:
    """Normalize RFID UID: removes spaces, dashes, colons and converts to uppercase hex."""
    return uid.replace(" ", "").replace("-", "").replace(":", "").upper().strip()

class ProductService:
    @staticmethod
    def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
        return db.query(Product).filter(Product.id == product_id).first()

    @staticmethod
    def get_product_by_code(db: Session, product_code: str) -> Optional[Product]:
        return db.query(Product).filter(Product.product_id == product_code.strip()).first()

    @staticmethod
    def get_product_by_rfid_uid(db: Session, uid: str) -> Optional[Product]:
        norm_uid = normalize_uid(uid)
        tag = db.query(RFIDTag).filter(
            RFIDTag.uid == norm_uid,
            RFIDTag.status == TagStatus.ACTIVE
        ).first()
        if tag and tag.product:
            return tag.product
        return None

    @staticmethod
    def list_products(
        db: Session,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        rack_id: Optional[int] = None,
        stock_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        query = db.query(Product).filter(Product.active == True)

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if search:
            s = f"%{search}%"
            query = query.filter((Product.name.ilike(s)) | (Product.product_id.ilike(s)))

        products = query.offset(skip).limit(limit).all()
        results = []

        for p in products:
            # Get inventory quantity
            inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
            qty = inv.quantity if inv else 0
            rack = inv.rack if inv and inv.rack else None
            rack_code = rack.rack_code if rack else "A1"

            # Filter by rack if specified
            if rack_id and inv and inv.rack_id != rack_id:
                continue

            # Active RFID
            tag = db.query(RFIDTag).filter(
                RFIDTag.product_id == p.id,
                RFIDTag.status == TagStatus.ACTIVE
            ).first()
            rfid_uid = tag.uid if tag else None

            # Last detected time
            last_event = db.query(RFIDEvent).filter(
                RFIDEvent.product_id == p.id
            ).order_by(desc(RFIDEvent.timestamp)).first()
            last_detected = last_event.timestamp if last_event else None

            # Calculate stock status
            if qty == 0:
                s_status = "OUT_OF_STOCK"
            elif qty <= settings.CRITICAL_STOCK_DEFAULT:
                s_status = "CRITICAL"
            elif qty <= p.minimum_stock:
                s_status = "LOW"
            else:
                s_status = "OK"

            if stock_status and s_status != stock_status:
                continue

            results.append({
                "id": p.id,
                "product_id": p.product_id,
                "name": p.name,
                "category_id": p.category_id,
                "category": p.category,
                "description": p.description,
                "supplier": p.supplier,
                "unit": p.unit,
                "minimum_stock": p.minimum_stock,
                "image_url": p.image_url,
                "active": p.active,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "current_quantity": qty,
                "rack_code": rack_code,
                "rfid_uid": rfid_uid,
                "stock_status": s_status,
                "last_detected": last_detected
            })

        return results

    @staticmethod
    def get_product_details(db: Session, product_id: int) -> Dict[str, Any]:
        p = ProductService.get_product_by_id(db, product_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
        qty = inv.quantity if inv else 0
        rack = inv.rack if inv and inv.rack else None
        rack_code = rack.rack_code if rack else "A1"

        tag = db.query(RFIDTag).filter(
            RFIDTag.product_id == p.id,
            RFIDTag.status == TagStatus.ACTIVE
        ).first()
        rfid_uid = tag.uid if tag else None

        last_event = db.query(RFIDEvent).filter(
            RFIDEvent.product_id == p.id
        ).order_by(desc(RFIDEvent.timestamp)).first()
        last_detected = last_event.timestamp if last_event else None

        if qty == 0:
            s_status = "OUT_OF_STOCK"
        elif qty <= settings.CRITICAL_STOCK_DEFAULT:
            s_status = "CRITICAL"
        elif qty <= p.minimum_stock:
            s_status = "LOW"
        else:
            s_status = "OK"

        # RFID history for this product
        tags = db.query(RFIDTag).filter(RFIDTag.product_id == p.id).order_by(desc(RFIDTag.assigned_at)).all()

        return {
            "id": p.id,
            "product_id": p.product_id,
            "name": p.name,
            "category_id": p.category_id,
            "category": p.category,
            "description": p.description,
            "supplier": p.supplier,
            "unit": p.unit,
            "minimum_stock": p.minimum_stock,
            "image_url": p.image_url,
            "active": p.active,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "current_quantity": qty,
            "rack_code": rack_code,
            "rfid_uid": rfid_uid,
            "stock_status": s_status,
            "last_detected": last_detected,
            "rfid_tags": tags
        }

    @staticmethod
    def create_product(db: Session, product_in: ProductCreate, user_id: Optional[int] = None) -> Product:
        # Check duplicate product_id
        existing = ProductService.get_product_by_code(db, product_in.product_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product ID '{product_in.product_id}' is already registered."
            )

        # Get or create target Rack (default A1)
        rack = db.query(Rack).filter(Rack.rack_code == product_in.rack_code).first()
        if not rack:
            rack = Rack(rack_code=product_in.rack_code, name=f"Rack {product_in.rack_code}")
            db.add(rack)
            db.flush()

        # Create product
        p = Product(
            product_id=product_in.product_id.strip(),
            name=product_in.name.strip(),
            category_id=product_in.category_id,
            description=product_in.description,
            supplier=product_in.supplier,
            unit=product_in.unit,
            minimum_stock=product_in.minimum_stock,
            image_url=product_in.image_url,
            active=product_in.active,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(p)
        db.flush()

        # Handle RFID UID registration if provided
        if product_in.rfid_uid:
            norm_uid = normalize_uid(product_in.rfid_uid)
            existing_tag = db.query(RFIDTag).filter(RFIDTag.uid == norm_uid).first()
            if existing_tag and existing_tag.status == TagStatus.ACTIVE and existing_tag.product_id != p.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"RFID UID '{norm_uid}' is already assigned to another product (Product ID: {existing_tag.product.product_id if existing_tag.product else 'unknown'}). Use reassign if intended."
                )
            if existing_tag:
                existing_tag.product_id = p.id
                existing_tag.status = TagStatus.ACTIVE
                existing_tag.assigned_at = datetime.now(timezone.utc)
                existing_tag.unassigned_at = None
            else:
                new_tag = RFIDTag(
                    uid=norm_uid,
                    product_id=p.id,
                    status=TagStatus.ACTIVE,
                    assigned_at=datetime.now(timezone.utc)
                )
                db.add(new_tag)

        # Initialize Inventory stock
        inv = Inventory(
            product_id=p.id,
            rack_id=rack.id,
            quantity=product_in.initial_quantity,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(inv)
        db.flush()

        # If initial quantity > 0, record transaction
        if product_in.initial_quantity > 0:
            tx = InventoryTransaction(
                product_id=p.id,
                rack_id=rack.id,
                type=TransactionType.RECEIVE,
                quantity_change=product_in.initial_quantity,
                previous_quantity=0,
                new_quantity=product_in.initial_quantity,
                reason="Initial product registration stock",
                user_id=user_id,
                created_at=datetime.now(timezone.utc)
            )
            db.add(tx)

        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def update_product(db: Session, product_id: int, product_in: ProductUpdate) -> Product:
        p = ProductService.get_product_by_id(db, product_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        if product_in.name is not None:
            p.name = product_in.name
        if product_in.category_id is not None:
            p.category_id = product_in.category_id
        if product_in.description is not None:
            p.description = product_in.description
        if product_in.supplier is not None:
            p.supplier = product_in.supplier
        if product_in.unit is not None:
            p.unit = product_in.unit
        if product_in.minimum_stock is not None:
            p.minimum_stock = product_in.minimum_stock
        if product_in.image_url is not None:
            p.image_url = product_in.image_url
        if product_in.active is not None:
            p.active = product_in.active

        p.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(p)
        return p

    @staticmethod
    def assign_rfid(db: Session, product_id: int, rfid_uid: str) -> RFIDTag:
        p = ProductService.get_product_by_id(db, product_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        norm_uid = normalize_uid(rfid_uid)
        
        # Check if already assigned to another active product
        existing = db.query(RFIDTag).filter(RFIDTag.uid == norm_uid).first()
        if existing and existing.status == TagStatus.ACTIVE and existing.product_id != p.id:
            assigned_prod = existing.product.name if existing.product else "another product"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"RFID UID '{norm_uid}' is currently assigned to '{assigned_prod}'. Please use the reassign endpoint with confirmation."
            )

        # Deactivate any previous active tag for this product
        old_tags = db.query(RFIDTag).filter(
            RFIDTag.product_id == p.id,
            RFIDTag.status == TagStatus.ACTIVE
        ).all()
        for ot in old_tags:
            ot.status = TagStatus.UNASSIGNED
            ot.unassigned_at = datetime.now(timezone.utc)

        if existing:
            existing.product_id = p.id
            existing.status = TagStatus.ACTIVE
            existing.assigned_at = datetime.now(timezone.utc)
            existing.unassigned_at = None
            tag = existing
        else:
            tag = RFIDTag(
                uid=norm_uid,
                product_id=p.id,
                status=TagStatus.ACTIVE,
                assigned_at=datetime.now(timezone.utc)
            )
            db.add(tag)

        db.commit()
        db.refresh(tag)
        return tag

    @staticmethod
    def reassign_rfid(db: Session, new_product_id: int, rfid_uid: str, confirm: bool = True) -> RFIDTag:
        if not confirm:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reassignment confirmation required")

        p = ProductService.get_product_by_id(db, new_product_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target product not found")

        norm_uid = normalize_uid(rfid_uid)
        existing = db.query(RFIDTag).filter(RFIDTag.uid == norm_uid).first()
        if not existing:
            # Just create new
            return ProductService.assign_rfid(db, new_product_id, norm_uid)

        # Unassign previous product
        if existing.product_id and existing.product_id != p.id:
            existing.status = TagStatus.UNASSIGNED
            existing.unassigned_at = datetime.now(timezone.utc)
            db.flush()

        # Deactivate current tags on target product
        old_tags = db.query(RFIDTag).filter(
            RFIDTag.product_id == p.id,
            RFIDTag.status == TagStatus.ACTIVE
        ).all()
        for ot in old_tags:
            ot.status = TagStatus.UNASSIGNED
            ot.unassigned_at = datetime.now(timezone.utc)

        existing.product_id = p.id
        existing.status = TagStatus.ACTIVE
        existing.assigned_at = datetime.now(timezone.utc)
        existing.unassigned_at = None

        db.commit()
        db.refresh(existing)
        return existing

    @staticmethod
    def unassign_rfid(db: Session, product_id: int) -> None:
        tags = db.query(RFIDTag).filter(
            RFIDTag.product_id == product_id,
            RFIDTag.status == TagStatus.ACTIVE
        ).all()
        for t in tags:
            t.status = TagStatus.UNASSIGNED
            t.unassigned_at = datetime.now(timezone.utc)
        db.commit()

product_service = ProductService()

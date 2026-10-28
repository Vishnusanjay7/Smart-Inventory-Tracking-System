from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.rack import Rack
from app.models.transaction import InventoryTransaction, TransactionType
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.models.rfid_tag import RFIDTag, TagStatus
from app.schemas.inventory import InventoryOperationRequest
from app.websocket.manager import ws_manager
from app.core.config import settings

class InventoryService:
    _idempotency_cache: Dict[str, Any] = {}
    @staticmethod
    def get_inventory_list(
        db: Session,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        rack_id: Optional[int] = None,
        stock_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        query = db.query(Inventory).join(Product).filter(Product.active == True)

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if rack_id:
            query = query.filter(Inventory.rack_id == rack_id)

        if search:
            s = f"%{search}%"
            query = query.filter((Product.name.ilike(s)) | (Product.product_id.ilike(s)))

        inventory_items = query.offset(skip).limit(limit).all()
        results = []

        for inv in inventory_items:
            p = inv.product
            r = inv.rack

            tag = db.query(RFIDTag).filter(
                RFIDTag.product_id == p.id,
                RFIDTag.status == TagStatus.ACTIVE
            ).first()
            rfid_uid = tag.uid if tag else None

            if inv.quantity == 0:
                s_status = "OUT_OF_STOCK"
            elif inv.quantity <= settings.CRITICAL_STOCK_DEFAULT:
                s_status = "CRITICAL"
            elif inv.quantity <= p.minimum_stock:
                s_status = "LOW"
            else:
                s_status = "OK"

            if stock_status and s_status != stock_status:
                continue

            results.append({
                "id": inv.id,
                "product_id": p.id,
                "product_code": p.product_id,
                "product_name": p.name,
                "category_name": p.category.name if p.category else None,
                "rfid_uid": rfid_uid,
                "rack_id": r.id,
                "rack_code": r.rack_code,
                "quantity": inv.quantity,
                "minimum_stock": p.minimum_stock,
                "stock_status": s_status,
                "updated_at": inv.updated_at
            })

        return results

    @staticmethod
    async def perform_operation(
        db: Session,
        product_id: int,
        op: InventoryOperationRequest,
        user_id: Optional[int] = None,
        user_name: Optional[str] = None
    ) -> InventoryTransaction:
        # Check idempotency
        if op.idempotency_key:
            now = datetime.now(timezone.utc)
            InventoryService._idempotency_cache = {
                k: v for k, v in InventoryService._idempotency_cache.items()
                if (now - v[0]).total_seconds() < 60
            }
            if op.idempotency_key in InventoryService._idempotency_cache:
                cached_tx_id = InventoryService._idempotency_cache[op.idempotency_key][1]
                cached_tx = db.query(InventoryTransaction).filter(InventoryTransaction.id == cached_tx_id).first()
                if cached_tx:
                    return cached_tx

        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        rack_code = op.rack_code or "A1"
        rack = db.query(Rack).filter(Rack.rack_code == rack_code).first()
        if not rack:
            rack = Rack(rack_code=rack_code, name=f"Rack {rack_code}")
            db.add(rack)
            db.flush()

        inv = db.query(Inventory).filter(
            Inventory.product_id == p.id,
            Inventory.rack_id == rack.id
        ).with_for_update().first()

        if not inv:
            inv = Inventory(
                product_id=p.id,
                rack_id=rack.id,
                quantity=0,
                updated_at=datetime.now(timezone.utc)
            )
            db.add(inv)
            db.flush()

        prev_qty = inv.quantity

        # Compute quantity change
        if op.type in [TransactionType.RECEIVE, TransactionType.ADD, TransactionType.RETURN]:
            delta = op.quantity
        elif op.type in [TransactionType.DISPATCH, TransactionType.REMOVE, TransactionType.DAMAGE]:
            delta = -op.quantity
        elif op.type == TransactionType.ADJUSTMENT:
            # For adjustment, op.quantity is the target absolute count or delta
            # We treat positive quantity as addition unless reason specifies reset
            delta = op.quantity if op.quantity != 0 else 0
        else:
            delta = op.quantity

        new_qty = prev_qty + delta

        if new_qty < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot perform {op.type.value} of {op.quantity} units. Current stock is {prev_qty} units (would result in negative quantity {new_qty})."
            )

        # Update inventory
        inv.quantity = new_qty
        inv.updated_at = datetime.now(timezone.utc)

        # Create audit transaction
        tx = InventoryTransaction(
            product_id=p.id,
            rack_id=rack.id,
            type=op.type,
            quantity_change=delta,
            previous_quantity=prev_qty,
            new_quantity=new_qty,
            reason=op.reason or f"{op.type.value} operation performed",
            user_id=user_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(tx)

        # Evaluate stock alerts
        if new_qty <= settings.CRITICAL_STOCK_DEFAULT:
            # Create or update Critical Alert
            alert = Alert(
                type=AlertType.CRITICAL_STOCK,
                severity=AlertSeverity.CRITICAL,
                message=f"Critical Stock Warning: '{p.name}' ({p.product_id}) on Rack {rack.rack_code} has only {new_qty} units remaining (Critical threshold: {settings.CRITICAL_STOCK_DEFAULT}).",
                related_product_id=p.id,
                status=AlertStatus.UNRESOLVED,
                created_at=datetime.now(timezone.utc)
            )
            db.add(alert)
            db.flush()
            await ws_manager.broadcast("ALERT_TRIGGERED", {
                "id": alert.id,
                "type": alert.type.value,
                "severity": alert.severity.value,
                "message": alert.message,
                "product_name": p.name,
                "created_at": str(alert.created_at)
            })
        elif new_qty <= p.minimum_stock:
            # Create Low Stock Alert
            alert = Alert(
                type=AlertType.LOW_STOCK,
                severity=AlertSeverity.WARNING,
                message=f"Low Stock Warning: '{p.name}' ({p.product_id}) on Rack {rack.rack_code} has {new_qty} units (Minimum required: {p.minimum_stock}).",
                related_product_id=p.id,
                status=AlertStatus.UNRESOLVED,
                created_at=datetime.now(timezone.utc)
            )
            db.add(alert)
            db.flush()
            await ws_manager.broadcast("ALERT_TRIGGERED", {
                "id": alert.id,
                "type": alert.type.value,
                "severity": alert.severity.value,
                "message": alert.message,
                "product_name": p.name,
                "created_at": str(alert.created_at)
            })
        else:
            # If stock is now healthy, resolve any existing LOW_STOCK or CRITICAL_STOCK alerts for this product
            open_alerts = db.query(Alert).filter(
                Alert.related_product_id == p.id,
                Alert.type.in_([AlertType.LOW_STOCK, AlertType.CRITICAL_STOCK]),
                Alert.status == AlertStatus.UNRESOLVED
            ).all()
            for al in open_alerts:
                al.status = AlertStatus.RESOLVED
                al.resolved_at = datetime.now(timezone.utc)
                al.resolved_by = user_id

        db.commit()
        db.refresh(tx)

        if op.idempotency_key:
            InventoryService._idempotency_cache[op.idempotency_key] = (datetime.now(timezone.utc), tx.id)

        # Broadcast real-time WebSocket update
        await ws_manager.broadcast("INVENTORY_UPDATED", {
            "transaction_id": tx.id,
            "product_id": p.id,
            "product_code": p.product_id,
            "product_name": p.name,
            "rack_code": rack.rack_code,
            "type": tx.type.value,
            "quantity_change": tx.quantity_change,
            "previous_quantity": tx.previous_quantity,
            "new_quantity": tx.new_quantity,
            "reason": tx.reason,
            "user_name": user_name or "System",
            "timestamp": str(tx.created_at)
        })

        return tx

inventory_service = InventoryService()

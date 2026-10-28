import io
import csv
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.product import Product
from app.models.inventory import Inventory
from app.models.transaction import InventoryTransaction
from app.models.rfid_event import RFIDEvent
from app.models.rfid_tag import RFIDTag, TagStatus
from app.models.device import Device
from app.models.alert import Alert

class ReportService:
    @staticmethod
    def generate_inventory_csv(db: Session) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Product ID", "Product Name", "Category", "RFID UID", "Rack", "Quantity", "Minimum Stock", "Status", "Updated At"])

        inv_items = db.query(Inventory).all()
        for inv in inv_items:
            p = inv.product
            r = inv.rack
            tag = db.query(RFIDTag).filter(RFIDTag.product_id == p.id, RFIDTag.status == TagStatus.ACTIVE).first()
            uid = tag.uid if tag else "UNASSIGNED"
            
            if inv.quantity == 0:
                s = "OUT_OF_STOCK"
            elif inv.quantity <= p.minimum_stock:
                s = "LOW_STOCK"
            else:
                s = "HEALTHY"

            writer.writerow([
                p.product_id,
                p.name,
                p.category.name if p.category else "Uncategorized",
                uid,
                r.rack_code,
                inv.quantity,
                p.minimum_stock,
                s,
                inv.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            ])

        return output.getvalue()

    @staticmethod
    def generate_transactions_csv(db: Session) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Transaction ID", "Timestamp", "Product ID", "Product Name", "Rack", "Type", "Change", "Prev Qty", "New Qty", "Reason", "User"])

        txs = db.query(InventoryTransaction).order_by(desc(InventoryTransaction.created_at)).all()
        for tx in txs:
            p = tx.product
            r = tx.rack
            u = tx.user
            writer.writerow([
                tx.id,
                tx.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                p.product_id,
                p.name,
                r.rack_code,
                tx.type.value,
                tx.quantity_change,
                tx.previous_quantity,
                tx.new_quantity,
                tx.reason or "",
                u.name if u else "System"
            ])

        return output.getvalue()

    @staticmethod
    def generate_rfid_activity_csv(db: Session) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Event ID", "Timestamp", "RFID UID", "Product ID", "Product Name", "Reader", "Device", "Rack", "Event Type", "Source"])

        events = db.query(RFIDEvent).order_by(desc(RFIDEvent.timestamp)).all()
        for ev in events:
            p = ev.product
            r = ev.rack
            writer.writerow([
                ev.id,
                ev.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                ev.uid,
                p.product_id if p else "N/A",
                p.name if p else "Unknown Product",
                ev.reader_id,
                ev.device_id,
                r.rack_code if r else "A1",
                ev.event_type.value,
                ev.source
            ])

        return output.getvalue()

    @staticmethod
    def generate_low_stock_csv(db: Session) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Product ID", "Product Name", "Category", "Rack", "Current Stock", "Minimum Stock", "Deficit"])

        inv_items = db.query(Inventory).all()
        for inv in inv_items:
            p = inv.product
            if inv.quantity <= p.minimum_stock:
                writer.writerow([
                    p.product_id,
                    p.name,
                    p.category.name if p.category else "Uncategorized",
                    inv.rack.rack_code,
                    inv.quantity,
                    p.minimum_stock,
                    p.minimum_stock - inv.quantity
                ])

        return output.getvalue()

    @staticmethod
    def generate_device_status_csv(db: Session) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Device ID", "Type", "Status", "IP Address", "Firmware", "Uptime Seconds", "Last Heartbeat"])

        devices = db.query(Device).all()
        for d in devices:
            writer.writerow([
                d.device_id,
                d.type,
                d.status.value,
                d.ip_address or "N/A",
                d.firmware_version,
                d.uptime_seconds,
                d.last_heartbeat.strftime("%Y-%m-%d %H:%M:%S") if d.last_heartbeat else "Never"
            ])

        return output.getvalue()

report_service = ReportService()

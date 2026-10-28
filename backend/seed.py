import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend root is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.rack import Rack, RackStatus
from app.models.device import Device, Reader, DeviceStatus, ReaderStatus
from app.models.product import Product
from app.models.rfid_tag import RFIDTag, TagStatus
from app.models.inventory import Inventory
from app.models.transaction import InventoryTransaction, TransactionType
from app.models.rfid_event import RFIDEvent, RFIDEventType
from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus

def seed_database():
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Users
        admin = db.query(User).filter(User.email == "admin@smartrack.io").first()
        if not admin:
            admin = User(
                name="Chief Warehouse Admin",
                email="admin@smartrack.io",
                password_hash=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                active=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(admin)
            print("  + Seeded Admin user: admin@smartrack.io / admin123")

        manager = db.query(User).filter(User.email == "manager@smartrack.io").first()
        if not manager:
            manager = User(
                name="Inventory Operations Manager",
                email="manager@smartrack.io",
                password_hash=get_password_hash("manager123"),
                role=UserRole.MANAGER,
                active=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(manager)
            print("  + Seeded Manager user: manager@smartrack.io / manager123")

        staff = db.query(User).filter(User.email == "staff@smartrack.io").first()
        if not staff:
            staff = User(
                name="Floor Scan Operator",
                email="staff@smartrack.io",
                password_hash=get_password_hash("staff123"),
                role=UserRole.STAFF,
                active=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(staff)
            print("  + Seeded Staff user: staff@smartrack.io / staff123")

        db.flush()

        # 2. Seed Rack A1
        rack_a1 = db.query(Rack).filter(Rack.rack_code == "A1").first()
        if not rack_a1:
            rack_a1 = Rack(
                rack_code="A1",
                name="Primary Smart Storage Rack A1",
                description="Heavy duty physical rack unit with integrated SPI RFID scanner header.",
                status=RackStatus.ACTIVE
            )
            db.add(rack_a1)
            db.flush()
            print("  + Seeded Rack A1")

        # 3. Seed Hardware: ESP8266-01 and RC522-01
        device = db.query(Device).filter(Device.device_id == "ESP8266-01").first()
        if not device:
            device = Device(
                device_id="ESP8266-01",
                type="ESP8266 NodeMCU",
                status=DeviceStatus.ONLINE,
                ip_address="192.168.1.50",
                last_heartbeat=datetime.now(timezone.utc),
                firmware_version="1.0.0",
                uptime_seconds=3600
            )
            db.add(device)
            db.flush()
            print("  + Seeded Device ESP8266-01")

        reader = db.query(Reader).filter(Reader.reader_id == "RC522-01").first()
        if not reader:
            reader = Reader(
                reader_id="RC522-01",
                device_id="ESP8266-01",
                rack_id=rack_a1.id,
                status=ReaderStatus.CONNECTED,
                last_seen=datetime.now(timezone.utc)
            )
            db.add(reader)
            db.flush()
            print("  + Seeded Reader RC522-01 mounted on Rack A1")

        # 4. Seed Categories
        categories_data = [
            ("Electronics & Compute", "Laptops, monitors, motherboards, and micro-controllers"),
            ("Industrial Tools", "Power tools, torque wrenches, and diagnostic meters"),
            ("Networking & Cabling", "SFP transceivers, patch cords, switches, and patch panels"),
            ("Safety & PPE", "High-visibility vests, Kevlar gloves, and hardhats")
        ]
        cat_map = {}
        for cname, cdesc in categories_data:
            cat = db.query(Category).filter(Category.name == cname).first()
            if not cat:
                cat = Category(name=cname, description=cdesc)
                db.add(cat)
                db.flush()
                print(f"  + Seeded Category: {cname}")
            cat_map[cname] = cat

        # 5. Seed Real Products
        products_data = [
            {
                "product_id": "LAP001",
                "name": "Enterprise Laptop 15-inch",
                "category": "Electronics & Compute",
                "supplier": "Dell Technologies",
                "unit": "units",
                "minimum_stock": 3,
                "rfid_uid": "E234A891",
                "quantity": 12
            },
            {
                "product_id": "MON002",
                "name": "Ultra-HD 27-inch Monitor",
                "category": "Electronics & Compute",
                "supplier": "LG Electronics",
                "unit": "units",
                "minimum_stock": 4,
                "rfid_uid": "F354B902",
                "quantity": 8
            },
            {
                "product_id": "DRL003",
                "name": "Cordless Brushless Hammer Drill",
                "category": "Industrial Tools",
                "supplier": "DeWalt Tools",
                "unit": "pcs",
                "minimum_stock": 5,
                "rfid_uid": "A1B2C3D4",
                "quantity": 3  # Low Stock
            },
            {
                "product_id": "SFP004",
                "name": "10G SFP+ Optical Transceiver",
                "category": "Networking & Cabling",
                "supplier": "Cisco Systems",
                "unit": "pcs",
                "minimum_stock": 5,
                "rfid_uid": "C5D6E7F8",
                "quantity": 1  # Critical Stock
            },
            {
                "product_id": "GLV005",
                "name": "High-Dexterity Kevlar Work Gloves",
                "category": "Safety & PPE",
                "supplier": "Ansell Protective",
                "unit": "pairs",
                "minimum_stock": 10,
                "rfid_uid": "9A8B7C6D",
                "quantity": 38
            }
        ]

        now = datetime.now(timezone.utc)

        for pdata in products_data:
            prod = db.query(Product).filter(Product.product_id == pdata["product_id"]).first()
            if not prod:
                prod = Product(
                    product_id=pdata["product_id"],
                    name=pdata["name"],
                    category_id=cat_map[pdata["category"]].id,
                    supplier=pdata["supplier"],
                    unit=pdata["unit"],
                    minimum_stock=pdata["minimum_stock"],
                    active=True,
                    created_at=now - timedelta(days=7),
                    updated_at=now
                )
                db.add(prod)
                db.flush()

                # RFID Tag
                tag = RFIDTag(
                    uid=pdata["rfid_uid"],
                    product_id=prod.id,
                    status=TagStatus.ACTIVE,
                    assigned_at=now - timedelta(days=7)
                )
                db.add(tag)

                # Inventory
                inv = Inventory(
                    product_id=prod.id,
                    rack_id=rack_a1.id,
                    quantity=pdata["quantity"],
                    updated_at=now
                )
                db.add(inv)

                # Initial receive transaction
                tx_init = InventoryTransaction(
                    product_id=prod.id,
                    rack_id=rack_a1.id,
                    type=TransactionType.RECEIVE,
                    quantity_change=pdata["quantity"] + 10,
                    previous_quantity=0,
                    new_quantity=pdata["quantity"] + 10,
                    reason="Initial stock intake upon warehouse shelf deployment",
                    user_id=admin.id,
                    created_at=now - timedelta(days=6)
                )
                db.add(tx_init)

                # Historical transactions across distinct days for demand forecasting
                tx_disp1 = InventoryTransaction(
                    product_id=prod.id,
                    rack_id=rack_a1.id,
                    type=TransactionType.DISPATCH,
                    quantity_change=-4,
                    previous_quantity=pdata["quantity"] + 10,
                    new_quantity=pdata["quantity"] + 6,
                    reason="Project site dispatch order #7801",
                    user_id=manager.id,
                    created_at=now - timedelta(days=4)
                )
                db.add(tx_disp1)

                tx_disp2 = InventoryTransaction(
                    product_id=prod.id,
                    rack_id=rack_a1.id,
                    type=TransactionType.DISPATCH,
                    quantity_change=-3,
                    previous_quantity=pdata["quantity"] + 6,
                    new_quantity=pdata["quantity"] + 3,
                    reason="Engineering lab dispatch order #7822",
                    user_id=staff.id,
                    created_at=now - timedelta(days=2)
                )
                db.add(tx_disp2)

                tx_disp3 = InventoryTransaction(
                    product_id=prod.id,
                    rack_id=rack_a1.id,
                    type=TransactionType.DISPATCH,
                    quantity_change=-3,
                    previous_quantity=pdata["quantity"] + 3,
                    new_quantity=pdata["quantity"],
                    reason="Field technician requisition #7845",
                    user_id=staff.id,
                    created_at=now - timedelta(days=1)
                )
                db.add(tx_disp3)

                # Historical RFID scan events
                for day_offset in range(3, 0, -1):
                    ev = RFIDEvent(
                        uid=pdata["rfid_uid"],
                        product_id=prod.id,
                        reader_id="RC522-01",
                        device_id="ESP8266-01",
                        rack_id=rack_a1.id,
                        event_type=RFIDEventType.DETECTED,
                        source="ESP8266-01",
                        timestamp=now - timedelta(days=day_offset, hours=2 * day_offset)
                    )
                    db.add(ev)

                # Alerts if low or critical stock
                if pdata["quantity"] <= 2:
                    alert = Alert(
                        type=AlertType.CRITICAL_STOCK,
                        severity=AlertSeverity.CRITICAL,
                        message=f"Critical Stock Warning: '{prod.name}' ({prod.product_id}) on Rack A1 has only {pdata['quantity']} unit(s) remaining.",
                        related_product_id=prod.id,
                        status=AlertStatus.UNRESOLVED,
                        created_at=now - timedelta(hours=3)
                    )
                    db.add(alert)
                elif pdata["quantity"] <= pdata["minimum_stock"]:
                    alert = Alert(
                        type=AlertType.LOW_STOCK,
                        severity=AlertSeverity.WARNING,
                        message=f"Low Stock Warning: '{prod.name}' ({prod.product_id}) on Rack A1 has {pdata['quantity']} units (Minimum: {pdata['minimum_stock']}).",
                        related_product_id=prod.id,
                        status=AlertStatus.UNRESOLVED,
                        created_at=now - timedelta(hours=5)
                    )
                    db.add(alert)

                print(f"  + Seeded Product: {pdata['product_id']} ({pdata['name']}) with RFID {pdata['rfid_uid']}")

        db.commit()
        print("Successfully seeded all Smart Rack initial data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

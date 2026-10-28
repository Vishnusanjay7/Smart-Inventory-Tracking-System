import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import app
from app.core.security import create_access_token, get_password_hash
from app.models.user import User, UserRole
from app.models.rack import Rack, RackStatus
from app.models.device import Device, Reader, DeviceStatus, ReaderStatus
from app.core.config import settings

# Test in-memory SQLite database
TEST_DB_URL = "sqlite:///./test_smartrack.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    db = TestingSessionLocal()
    # Seed base test user
    admin_user = User(
        name="Test Admin",
        email="testadmin@smartrack.io",
        password_hash=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        active=True
    )
    db.add(admin_user)

    staff_user = User(
        name="Test Staff",
        email="teststaff@smartrack.io",
        password_hash=get_password_hash("admin123"),
        role=UserRole.STAFF,
        active=True
    )
    db.add(staff_user)

    rack = Rack(rack_code="A1", name="Test Rack A1", status=RackStatus.ACTIVE)
    db.add(rack)
    db.flush()

    dev = Device(device_id="ESP8266-01", type="ESP8266", status=DeviceStatus.ONLINE)
    db.add(dev)
    db.flush()

    reader = Reader(reader_id="RC522-01", device_id="ESP8266-01", rack_id=rack.id, status=ReaderStatus.CONNECTED)
    db.add(reader)

    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_headers():
    token = create_access_token(subject=1, role=UserRole.ADMIN.value)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def staff_headers():
    token = create_access_token(subject=2, role=UserRole.STAFF.value)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def device_headers():
    return {"X-Device-API-Key": settings.DEVICE_API_KEY}

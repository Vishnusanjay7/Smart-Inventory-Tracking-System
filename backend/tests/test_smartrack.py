import pytest
from app.core.config import settings

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_login_valid(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "testadmin@smartrack.io", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testadmin@smartrack.io"

def test_auth_login_invalid(client):
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "testadmin@smartrack.io", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_product_creation_and_rfid_assignment(client, admin_headers):
    # 1. Create a product with RFID
    product_payload = {
        "product_id": "TEST-LAP01",
        "name": "Test Enterprise Laptop",
        "supplier": "Test Corp",
        "unit": "pcs",
        "minimum_stock": 5,
        "initial_quantity": 10,
        "rack_code": "A1",
        "rfid_uid": "E234A891"
    }
    response = client.post(
        f"{settings.API_V1_STR}/products",
        json=product_payload,
        headers=admin_headers
    )
    assert response.status_code == 201
    prod_data = response.json()
    assert prod_data["product_id"] == "TEST-LAP01"
    assert prod_data["current_quantity"] == 10
    assert prod_data["rfid_uid"] == "E234A891"

    # 2. Try to assign same RFID UID to another product without reassignment -> should fail with 400
    duplicate_payload = {
        "product_id": "TEST-LAP02",
        "name": "Duplicate Tag Laptop",
        "supplier": "Test Corp",
        "unit": "pcs",
        "minimum_stock": 5,
        "initial_quantity": 5,
        "rack_code": "A1",
        "rfid_uid": "E234A891"
    }
    dup_res = client.post(
        f"{settings.API_V1_STR}/products",
        json=duplicate_payload,
        headers=admin_headers
    )
    assert dup_res.status_code == 400

def test_atomic_inventory_operations(client, admin_headers):
    # Get product id for TEST-LAP01
    products = client.get(f"{settings.API_V1_STR}/products", headers=admin_headers).json()
    test_prod = next(p for p in products if p["product_id"] == "TEST-LAP01")
    prod_id = test_prod["id"]

    # Current quantity should be 10. Perform DISPATCH of 3 units
    disp_res = client.post(
        f"{settings.API_V1_STR}/inventory/{prod_id}/operation",
        json={"type": "DISPATCH", "quantity": 3, "reason": "Dispatch to QA Lab", "rack_code": "A1"},
        headers=admin_headers
    )
    assert disp_res.status_code == 200
    tx = disp_res.json()
    assert tx["previous_quantity"] == 10
    assert tx["quantity_change"] == -3
    assert tx["new_quantity"] == 7

    # Perform RECEIVE of 5 units
    recv_res = client.post(
        f"{settings.API_V1_STR}/inventory/{prod_id}/operation",
        json={"type": "RECEIVE", "quantity": 5, "reason": "New shipment intake", "rack_code": "A1"},
        headers=admin_headers
    )
    assert recv_res.status_code == 200
    assert recv_res.json()["new_quantity"] == 12

    # Prevent negative stock: Try to DISPATCH 20 units (current is 12) -> should fail with 400
    fail_res = client.post(
        f"{settings.API_V1_STR}/inventory/{prod_id}/operation",
        json={"type": "DISPATCH", "quantity": 20, "reason": "Exceeding stock", "rack_code": "A1"},
        headers=admin_headers
    )
    assert fail_res.status_code == 400
    assert "negative quantity" in fail_res.json()["detail"]

    # Test idempotency key prevents duplicate execution
    idem_key = "unique-test-key-12345"
    idem_res1 = client.post(
        f"{settings.API_V1_STR}/inventory/{prod_id}/operation",
        json={"type": "RECEIVE", "quantity": 2, "reason": "Idempotent intake", "rack_code": "A1", "idempotency_key": idem_key},
        headers=admin_headers
    )
    assert idem_res1.status_code == 200
    tx1_id = idem_res1.json()["id"]
    new_qty1 = idem_res1.json()["new_quantity"]

    idem_res2 = client.post(
        f"{settings.API_V1_STR}/inventory/{prod_id}/operation",
        json={"type": "RECEIVE", "quantity": 2, "reason": "Idempotent intake", "rack_code": "A1", "idempotency_key": idem_key},
        headers=admin_headers
    )
    assert idem_res2.status_code == 200
    assert idem_res2.json()["id"] == tx1_id
    assert idem_res2.json()["new_quantity"] == new_qty1

def test_iot_rfid_hardware_endpoints(client, device_headers):
    # 1. Invalid API Key -> 401
    unauth_res = client.post(
        f"{settings.API_V1_STR}/iot/rfid",
        json={"device_id": "ESP8266-01", "reader_id": "RC522-01", "rfid_uid": "E234A891"},
        headers={"X-Device-API-Key": "INVALID-KEY-123"}
    )
    assert unauth_res.status_code == 401

    # 2. Valid registered RFID scan -> 200
    valid_res = client.post(
        f"{settings.API_V1_STR}/iot/rfid",
        json={"device_id": "ESP8266-01", "reader_id": "RC522-01", "rfid_uid": "E2 34 A8 91"},
        headers=device_headers
    )
    assert valid_res.status_code == 200
    data = valid_res.json()
    assert data["status"] == "success"
    assert data["product_code"] == "TEST-LAP01"

    # 3. Duplicate scan within debounce window -> should be debounced
    debounced_res = client.post(
        f"{settings.API_V1_STR}/iot/rfid",
        json={"device_id": "ESP8266-01", "reader_id": "RC522-01", "rfid_uid": "E234A891"},
        headers=device_headers
    )
    assert debounced_res.status_code == 200
    assert debounced_res.json()["status"] == "ignored_debounce"

    # 4. Unknown RFID tag scan -> generates UNKNOWN event and alert
    unknown_res = client.post(
        f"{settings.API_V1_STR}/iot/rfid",
        json={"device_id": "ESP8266-01", "reader_id": "RC522-01", "rfid_uid": "99AA88BB"},
        headers=device_headers
    )
    assert unknown_res.status_code == 200
    assert unknown_res.json()["event_type"] == "UNKNOWN"

def test_iot_heartbeat(client, device_headers):
    # 1. Invalid API Key -> 401
    unauth_res = client.post(
        f"{settings.API_V1_STR}/iot/heartbeat",
        json={"device_id": "ESP8266-01"},
        headers={"X-Device-API-Key": "WRONG-KEY"}
    )
    assert unauth_res.status_code == 401

    # 2. Missing required device_id -> 422 Validation Error
    invalid_res = client.post(
        f"{settings.API_V1_STR}/iot/heartbeat",
        json={"uptime_seconds": 120},
        headers=device_headers
    )
    assert invalid_res.status_code == 422

    # 3. Valid heartbeat -> 200 OK
    hb_res = client.post(
        f"{settings.API_V1_STR}/iot/heartbeat",
        json={"device_id": "ESP8266-01", "reader_id": "RC522-01", "ip_address": "192.168.1.55", "uptime_seconds": 120},
        headers=device_headers
    )
    assert hb_res.status_code == 200
    assert hb_res.json()["status"] == "ok"
    assert hb_res.json()["device_status"] == "ONLINE"

def test_iot_rfid_validation_errors(client, device_headers):
    # Missing required rfid_uid -> 422
    missing_uid_res = client.post(
        f"{settings.API_V1_STR}/iot/rfid",
        json={"device_id": "ESP8266-01", "reader_id": "RC522-01"},
        headers=device_headers
    )
    assert missing_uid_res.status_code == 422

    # Invalid short RFID UID -> 400 Bad Request
    short_uid_res = client.post(
        f"{settings.API_V1_STR}/iot/rfid",
        json={"device_id": "ESP8266-01", "reader_id": "RC522-01", "rfid_uid": "A"},
        headers=device_headers
    )
    assert short_uid_res.status_code == 400
    assert "Invalid RFID UID format" in short_uid_res.json()["detail"]

def test_reports_csv_generation(client, admin_headers):
    res = client.get(f"{settings.API_V1_STR}/reports/inventory/csv", headers=admin_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Product ID,Product Name" in res.text

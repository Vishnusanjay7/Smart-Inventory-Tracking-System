# Smart Rack REST & WebSocket API Specification

Base URL: `http://localhost:8000/api/v1`  
Interactive Swagger UI: `http://localhost:8000/docs`  
Interactive ReDoc: `http://localhost:8000/redoc`

---

## 1. Authentication & Security

All API endpoints (except `/auth/login`, `/health`, and `/iot/*`) require a Bearer JWT Token in the `Authorization` header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Hardware endpoints (`/api/v1/iot/rfid` and `/api/v1/iot/heartbeat`) require the hardware device API key header:

```http
X-Device-API-Key: SR-IOT-DEVICE-KEY-98421-ESP8266-A1
```

---

## 2. IoT Hardware Endpoints (ESP8266)

### A. Report Physical RFID Scan

`POST /api/v1/iot/rfid`

**Headers:**
- `X-Device-API-Key: <DEVICE_KEY>`
- `Content-Type: application/json`

**Request Payload:**
```json
{
  "device_id": "ESP8266-01",
  "reader_id": "RC522-01",
  "rfid_uid": "E234A891",
  "timestamp": "2026-08-23T10:42:18Z"
}
```

**Response (200 OK - Tag Registered):**
```json
{
  "status": "success",
  "event_id": 142,
  "event_type": "DETECTED",
  "uid": "E234A891",
  "product_id": 1,
  "product_code": "LAP001",
  "product_name": "Enterprise Laptop 15-inch",
  "rack": "A1"
}
```

**Response (200 OK - Unknown Tag):**
```json
{
  "status": "success",
  "event_id": 143,
  "event_type": "UNKNOWN",
  "uid": "99AA88BB",
  "product_id": null,
  "product_code": null,
  "product_name": null,
  "rack": "A1"
}
```

---

### B. Device Heartbeat Ping

`POST /api/v1/iot/heartbeat`

**Request Payload:**
```json
{
  "device_id": "ESP8266-01",
  "reader_id": "RC522-01",
  "ip_address": "192.168.1.50",
  "firmware_version": "1.0.0",
  "uptime_seconds": 3600
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "server_time": "2026-08-23T10:42:30.123456Z",
  "device_id": "ESP8266-01",
  "device_status": "ONLINE"
}
```

---

## 3. Inventory Operations

### Perform Stock Operation

`POST /api/v1/inventory/{product_id}/operation`

**Request Payload:**
```json
{
  "type": "RECEIVE",
  "quantity": 5,
  "reason": "PO #9821 supplier intake",
  "rack_code": "A1"
}
```

*Supported Types:* `RECEIVE`, `ADD`, `REMOVE`, `DISPATCH`, `RETURN`, `DAMAGE`, `ADJUSTMENT`.

**Response (200 OK):**
```json
{
  "id": 89,
  "product_id": 1,
  "product_code": "LAP001",
  "product_name": "Enterprise Laptop 15-inch",
  "rfid_uid": "E234A891",
  "rack_id": 1,
  "rack_code": "A1",
  "type": "RECEIVE",
  "quantity_change": 5,
  "previous_quantity": 12,
  "new_quantity": 17,
  "reason": "PO #9821 supplier intake",
  "user_id": 1,
  "user_name": "Chief Warehouse Admin",
  "created_at": "2026-08-23T10:45:00.000000Z"
}
```

---

## 4. Real-Time WebSocket Protocol

WebSocket Endpoint: `ws://localhost:8000/ws/live`

### Event Format:
```json
{
  "type": "RFID_DETECTED",
  "data": {
    "event_id": 142,
    "uid": "E234A891",
    "event_type": "DETECTED",
    "product_id": 1,
    "product_code": "LAP001",
    "product_name": "Enterprise Laptop 15-inch",
    "reader_id": "RC522-01",
    "device_id": "ESP8266-01",
    "rack_code": "A1",
    "source": "ESP8266-01",
    "timestamp": "2026-08-23T10:42:18.000000"
  }
}
```

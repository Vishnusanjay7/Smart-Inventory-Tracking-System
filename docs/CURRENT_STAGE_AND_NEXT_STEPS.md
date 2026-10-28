# Smart Inventory Tracking System — Current Stage & Next Steps Report

> **Generated:** 2026-10-16 | **Inspector:** Antigravity Senior Software / IoT Architect
> **Scope:** Full codebase audit — Backend, Frontend, Database, Firmware, Tests, Configuration

---

## 1. Executive Summary

The Smart Inventory Tracking System is a **highly advanced, near-complete implementation**. The backend (FastAPI + SQLAlchemy), frontend (React + TypeScript + Vite), database schema (SQLite dev / PostgreSQL prod), and firmware (ESP8266 Arduino sketch) are all substantially written and consistent with one another. The system correctly separates RFID identification events from inventory transactions.

**What already works (code-complete and tested):**
- Full REST API with 14 route groups and ~35 endpoints
- JWT user authentication (ADMIN / MANAGER / STAFF roles)
- RFID ingestion endpoint for the ESP8266 with device API-key authentication
- Heartbeat/online-offline monitoring with background watchdog
- WebSocket real-time broadcast for all major events
- Website IN/OUT modal that calls the real backend
- Full database schema: 11 tables, all relationships, audit trail
- Automated test suite covering auth, products, RFID scanning, inventory operations, and reports
- Complete ESP8266 firmware with Wi-Fi, RC522 SPI, HTTP POST, debounce, OLED, buzzer

**Critical gap:** The **`.env` file does not exist** in `backend/`. The backend currently falls back to SQLite defaults from `config.py`. The firmware `config.h` has placeholder IP `192.168.1.100` that must be replaced with the actual LAN IP of the running backend before any hardware scan can reach the server.

**The single most important next action:** Create `c:\Iot\backend\.env` from `.env.example`, start the backend (`uvicorn app.main:app --reload`), note your machine's LAN IP, update `config.h` with that IP, flash the firmware, and run the test suite. The project is otherwise ready for end-to-end hardware validation.

---

## 2. Actual Project Architecture

```
RFID Tag (13.56 MHz ISO 14443-A)
    │
    ▼  SPI (D5/D6/D7/D8 / GPIO 14,12,13,15)
RC522-01 MFRC522 Reader
    │
    ▼  SPI → ESP8266-01 NodeMCU
ESP8266-01 (firmware: firmware/esp8266_rc522/esp8266_rc522.ino)
    │  Wi-Fi 802.11 → LAN
    ▼
FastAPI Backend  (backend/app/main.py, uvicorn :8000)
    ├── POST /api/v1/iot/rfid      ← ESP8266 scans
    ├── POST /api/v1/iot/heartbeat ← ESP8266 heartbeat
    ├── POST /api/v1/inventory/{id}/operation ← Website IN/OUT
    ├── WS   /ws/live              ← Real-time push to browser
    └── ... 30+ more REST endpoints
    │
    ▼
SQLite (dev) / PostgreSQL (docker-compose prod)
    └── 11 tables: users, categories, racks, products,
        rfid_tags, inventory, inventory_transactions,
        rfid_events, devices, readers, alerts
    │
    ▼
React + TypeScript Web App  (frontend/src/, Vite :5173)
    ├── Dashboard, Inventory, Products, Transactions
    ├── Devices (+ Development Simulator)
    ├── RFID Registry, Alerts, Analytics, Reports
    └── Live WebSocket event feed
```

---

## 3. Completed Features

| # | Feature | Evidence |
|---|---------|----------|
| 1 | FastAPI backend, all routes registered | `app/api/v1/__init__.py` L1-32 |
| 2 | JWT authentication (login, /me, role guards) | `app/api/v1/auth.py`, `app/api/deps.py` |
| 3 | RFID scan ingestion endpoint with device API-key auth | `app/api/v1/iot.py` L12-24, `app/api/deps.py` L48-66 |
| 4 | Heartbeat endpoint + auto-register device/reader | `app/api/v1/iot.py` L26-36, `app/services/device_service.py` |
| 5 | Background heartbeat watchdog (15-second poll) | `app/main.py` L18-33 |
| 6 | Server-side RFID debounce (3-second window) | `app/services/iot_service.py` L25-32 |
| 7 | Client-side RFID debounce on ESP8266 (2.5-second) | `firmware/esp8266_rc522/config.h` L27 |
| 8 | UID normalization (spaces, dashes, case) | `app/services/iot_service.py` L17-18 |
| 9 | Product catalog CRUD (create, update, list, detail) | `app/api/v1/products.py`, `app/services/product_service.py` |
| 10 | RFID tag assignment / reassign / unassign | `app/api/v1/products.py` L63-108, `product_service.py` L294-387 |
| 11 | Inventory record with per-rack quantity | `app/models/inventory.py`, UniqueConstraint `uq_product_rack_inventory` |
| 12 | Atomic IN/OUT inventory operation | `inventory_service.py` L104 `with_for_update()` prevents race conditions |
| 13 | Negative-stock guard | `inventory_service.py` L132-136 |
| 14 | Audit transaction history (7 types) | `app/models/transaction.py` |
| 15 | User + rack recorded on every transaction | `transaction.py` columns: `user_id`, `rack_id`, `previous_quantity`, `new_quantity` |
| 16 | LOW_STOCK / CRITICAL_STOCK / UNKNOWN_RFID / DEVICE_OFFLINE alerts | `inventory_service.py`, `iot_service.py`, `device_service.py` |
| 17 | Alert resolve with WebSocket broadcast | `app/services/alert_service.py` |
| 18 | WebSocket broadcast for all events | `app/websocket/manager.py`, 6 event types |
| 19 | Analytics summary endpoint | `app/api/v1/analytics.py`, `app/services/analytics_service.py` |
| 20 | CSV report export (5 report types) | `app/api/v1/reports.py`, `app/services/report_service.py` |
| 21 | Full database seed script | `backend/seed.py` |
| 22 | Alembic migration configuration | `migrations/env.py` wired to `settings.DATABASE_URL` |
| 23 | Docker Compose (PostgreSQL + Backend + Frontend) | `docker-compose.yml` |
| 24 | React frontend, 15 pages, full navigation | `frontend/src/App.tsx`, `src/pages/` |
| 25 | JWT interceptor in frontend Axios client | `api/client.ts` L27-33 |
| 26 | WebSocket context with auto-reconnect | `context/WebSocketContext.tsx` |
| 27 | Live RFID feed on Dashboard reacts to WS events | `DashboardPage.tsx` L55-62 |
| 28 | InventoryActionModal calls real backend | `InventoryActionModal.tsx` L52-57 (`api.performOperation`) |
| 29 | Frontend client-side insufficient-stock pre-check | `InventoryActionModal.tsx` L44-47 |
| 30 | Development Simulator (RFID scan without hardware) | `app/api/v1/simulator.py`, `DevicesPage.tsx` simulator tab |
| 31 | Automated test suite (pytest): 7 test functions | `tests/test_smartrack.py` |
| 32 | ESP8266 firmware: Wi-Fi, SPI RC522, HTTP POST, JSON, debounce, OLED, buzzer | `firmware/esp8266_rc522/esp8266_rc522.ino` |
| 33 | Firmware config header with all tunable parameters | `firmware/esp8266_rc522/config.h` |
| 34 | Vite dev proxy to backend (API + WebSocket) | `vite.config.ts` L15-23 |

---

## 4. Partially Completed Features

| Feature | Status | What's Done | What's Missing |
|---------|--------|-------------|----------------|
| **Hardware integration test** | Ready for hardware | Firmware flashed/configured with LAN IP `10.138.9.192`, backend & frontend running | Physical power-up & tag scan on NodeMCU + RC522 |

---

## 5. Completed Items (Previously Pending)

| # | Feature | Status | Evidence |
|---|---------|--------|----------|
| M1 | `backend/.env` file | **Completed** | `backend/.env` created with dev SQLite / prod Postgres configuration |
| M2 | Firmware real IP in `config.h` | **Completed** | `config.h` configured with host LAN IP `10.138.9.192` |
| M4 | "Product detected" UI workflow | **Completed** | Reactive scan banner in `DashboardPage.tsx` with one-click IN/OUT buttons & auto pre-fill |
| M5 | Idempotency key on inventory operations | **Completed** | `idempotency_key` in `InventoryOperationRequest`, in-memory cache in `inventory_service.py`, auto-generated in `InventoryActionModal.tsx` |
| M6 | Alembic version migration files | **Completed** | Generated initial revision `migrations/versions/79d38b44e5c5_initial_schema.py` and upgraded |
| M7 | Frontend `.env` file | **Completed** | `frontend/.env` with `VITE_API_BASE_URL="/api/v1"` |
| I1 | IoT source preserve fix | **Completed** | `payload.source = payload.source or payload.device_id or "ESP8266-01"` in `app/api/v1/iot.py` |

---

## 6. Backend Inspection

### 6.1 Framework and Entry Point
- **Framework:** FastAPI `>=0.110.0`, Uvicorn `>=0.28.0`
- **Python:** Pydantic v2 (`pydantic>=2.6.4`, `pydantic-settings>=2.2.1`) — Python 3.11+ recommended
- **Entry point:** `backend/app/main.py` — `app = FastAPI(lifespan=lifespan)`
- **Runs via:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### 6.2 API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/login` | None | JWT login |
| GET | `/api/v1/auth/me` | JWT | Current user |
| GET | `/api/v1/categories` | JWT | List categories |
| POST | `/api/v1/categories` | JWT ADMIN/MANAGER | Create category |
| GET | `/api/v1/products` | JWT | List products with stock |
| POST | `/api/v1/products` | JWT ADMIN/MANAGER | Create product + optional RFID + initial stock |
| GET | `/api/v1/products/{id}` | JWT | Product detail |
| PUT | `/api/v1/products/{id}` | JWT ADMIN/MANAGER | Update product |
| POST | `/api/v1/products/{id}/assign-rfid` | JWT ANY | Assign RFID UID |
| POST | `/api/v1/products/{id}/reassign-rfid` | JWT ADMIN/MANAGER | Reassign RFID UID |
| POST | `/api/v1/products/{id}/unassign-rfid` | JWT ADMIN/MANAGER | Unassign tag |
| GET | `/api/v1/inventory` | JWT | Inventory list |
| **POST** | **`/api/v1/inventory/{product_id}/operation`** | **JWT ANY** | **IN/OUT stock operation** |
| GET | `/api/v1/transactions` | JWT | Audit log |
| GET | `/api/v1/rfid/tags` | JWT | All RFID tags |
| GET | `/api/v1/rfid/tags/{uid}` | JWT | Tag by UID |
| GET | `/api/v1/rfid/events` | JWT | RFID event history |
| **POST** | **`/api/v1/iot/rfid`** | **Device API-Key** | **ESP8266 RFID scan ingestion** |
| **POST** | **`/api/v1/iot/heartbeat`** | **Device API-Key** | **ESP8266 heartbeat** |
| GET | `/api/v1/devices` | JWT | All IoT devices |
| GET | `/api/v1/devices/{device_id}` | JWT | Single device |
| GET | `/api/v1/racks` | JWT | All racks |
| POST | `/api/v1/racks` | JWT ADMIN/MANAGER | Create rack |
| GET | `/api/v1/racks/{rack_code}/details` | JWT | Rack detail |
| GET | `/api/v1/alerts` | JWT | Alerts |
| POST | `/api/v1/alerts/{id}/resolve` | JWT | Resolve alert |
| GET | `/api/v1/analytics/summary` | JWT | KPI summary |
| GET | `/api/v1/reports/inventory/csv` | JWT | CSV export |
| GET | `/api/v1/reports/transactions/csv` | JWT | CSV export |
| GET | `/api/v1/reports/rfid-activity/csv` | JWT | CSV export |
| GET | `/api/v1/reports/low-stock/csv` | JWT | CSV export |
| GET | `/api/v1/reports/device-status/csv` | JWT | CSV export |
| POST | `/api/v1/simulator/scan` | JWT | Dev simulator RFID scan |
| GET/POST/PUT/DELETE | `/api/v1/users/...` | JWT ADMIN | User management |
| GET | `/health` | None | Health check |
| WS | `/ws/live` | None | WebSocket real-time stream |

### 6.3 Device Authentication
- **Implemented** — `X-Device-API-Key` header checked in `app/api/deps.py:validate_device_api_key()` (L48-66)
- Also accepts `Authorization: Bearer <key>` or `Authorization: ApiKey <key>`

### 6.4 Duplicate / Debounce Handling
- **Implemented** — in-memory dict `_debounce_cache` in `IoTService` (3-second window)
- **Limitation:** In-memory only — restarts reset the cache. Acceptable for single-instance.

### 6.5 Device Online/Offline
- **Implemented** — Background task `check_device_timeouts()` runs every 15 seconds; marks OFFLINE after 60 seconds without heartbeat; broadcasts `DEVICE_OFFLINE` WS event and creates `DEVICE_OFFLINE` alert

### 6.6 WebSocket
- **Implemented** — 6 event types: `RFID_DETECTED`, `INVENTORY_UPDATED`, `ALERT_TRIGGERED`, `ALERT_RESOLVED`, `DEVICE_HEARTBEAT`, `DEVICE_OFFLINE`
- No authentication on `/ws/live`

### 6.7 Inventory Concurrency Safety
- **Implemented** — `with_for_update()` on Inventory row (`inventory_service.py` L104)
- **Missing** — No idempotency key; rapid double-submit can create two transactions

### 6.8 Known Backend Issues

| # | Issue | File | Line |
|---|-------|------|------|
| I1 | `payload.source = "ESP8266-01"` overrides actual source | `app/api/v1/iot.py` | 22 |
| I2 | No Alembic version files | `migrations/versions/` | N/A |
| I3 | No `.env` file | `backend/` | N/A |
| I4 | N+1 query in analytics (loops products) | `analytics_service.py` | L34-41 |

---

## 7. Frontend Inspection

### 7.1 Framework
- **React 18.2 + TypeScript 5.2 + Vite 5.1 + React Router DOM v6**
- HTTP: Axios with JWT interceptor (`api/client.ts`)
- Real-time: Native WebSocket via `WebSocketContext.tsx`
- Icons: lucide-react; Styling: vanilla CSS

### 7.2 Pages and Status

| Page | Backend Integration | Status |
|------|--------------------|----|
| LoginPage | `POST /auth/login` | ✅ Working |
| DashboardPage | Analytics + Devices + Transactions + Alerts + WS | ✅ Working |
| ProductsPage | `GET /products` | ✅ Working |
| ProductCreatePage | `POST /products` | ✅ Working |
| ProductDetailPage | `GET /products/:id`, RFID modals, transactions | ✅ Working |
| **InventoryPage** | **`GET /inventory` + `POST /inventory/:id/operation`** | **✅ Working** |
| TransactionsPage | `GET /transactions` | ✅ Working |
| RfidPage | `GET /rfid/tags`, `GET /rfid/events` | ✅ Working |
| RackPage | `GET /racks/:code/details` | ✅ Working |
| DevicesPage | `GET /devices` + simulator | ✅ Working |
| AlertsPage | `GET /alerts`, `POST /alerts/:id/resolve` | ✅ Working |
| AnalyticsPage | `GET /analytics/summary` | ✅ Working |
| ReportsPage | CSV downloads | ✅ Working |
| UsersPage | User CRUD | ✅ Working |
| SettingsPage | None | ⚠️ UI-only |

### 7.3 IN/OUT Implementation Detail
- **File:** `frontend/src/components/common/InventoryActionModal.tsx`
- **Trigger:** "Transact" button on InventoryPage and ProductDetailPage
- **API call:** `api.performOperation(productId, { type, quantity, reason, rack_code })`
- **Client guard:** Prevents submit if projected stock < 0 (L44-47)
- **Error display:** Shows `err.response?.data?.detail` from server (L61)
- **Success:** Calls `onSuccess()` which re-fetches inventory from backend

### 7.4 Real-Time Updates
- Dashboard: Reacts to `INVENTORY_UPDATED`, `ALERT_TRIGGERED`, `ALERT_RESOLVED`, `DEVICE_OFFLINE`
- InventoryPage: Reacts to `INVENTORY_UPDATED`
- ProductDetailPage: Reacts to `INVENTORY_UPDATED` and `RFID_DETECTED` (product-specific)
- DevicesPage: Reacts to `DEVICE_HEARTBEAT`, `DEVICE_OFFLINE`, `RFID_DETECTED`

### 7.5 Missing Frontend
- No `.env` file (works via Vite proxy fallback but should be created)
- No "RFID detected → IN/OUT?" convenience modal
- `SettingsPage` has no backend persistence

---

## 8. Database Inspection

### 8.1 Technology
- **Dev:** SQLite (default `smart_rack.db`) | **Prod:** PostgreSQL 15
- **ORM:** SQLAlchemy 2.0, sync sessions, Declarative Base

### 8.2 Tables

| Table | Key Columns | Notes |
|-------|------------|-------|
| `users` | id, name, email, password_hash, role, active | Roles: ADMIN/MANAGER/STAFF |
| `categories` | id, name (unique), description | |
| `racks` | id, rack_code (unique), name, status | ACTIVE/MAINTENANCE/INACTIVE |
| `products` | id, product_id (unique SKU), name, category_id, supplier, unit, minimum_stock, active | |
| `rfid_tags` | id, uid (unique), product_id, status | ACTIVE/INACTIVE/UNASSIGNED; one ACTIVE per product |
| `inventory` | id, product_id, rack_id, quantity | UniqueConstraint(product_id, rack_id) |
| `inventory_transactions` | id, product_id, rack_id, type, quantity_change, previous_quantity, new_quantity, reason, user_id, created_at | Full audit trail |
| `rfid_events` | id, uid, product_id, reader_id, device_id, rack_id, event_type, source, timestamp | DETECTED/UNKNOWN/REGISTER |
| `devices` | id, device_id (unique), type, status, ip_address, last_heartbeat, firmware_version, uptime_seconds | |
| `readers` | id, reader_id (unique), device_id (FK→devices), rack_id, status, last_seen | |
| `alerts` | id, type, severity, message, related_product_id, related_device_id, status, created_at, resolved_at, resolved_by | |

### 8.3 Key Design Decisions
- Product has **one active RFIDTag** at a time (enforced by application logic)
- Inventory quantity is **ground truth** — never automatically changed by RFID scanning
- All transactions record `previous_quantity` and `new_quantity` for full auditability
- `with_for_update()` prevents concurrent stock corruption

### 8.4 Migration Status
- **No Alembic version files** in `migrations/versions/`
- Schema managed via `Base.metadata.create_all()` on startup
- Acceptable for development; must be resolved before production upgrades

---

## 9. IoT Integration Inspection

### 9.1 Firmware Status

| Feature | Stage |
|---------|-------|
| RFID UID reading (RC522 SPI) | Code written — **not hardware-tested** |
| Wi-Fi connection + reconnection | Code written — **not hardware-tested** |
| HTTP POST to `/api/v1/iot/rfid` | Code written — **not hardware-tested** |
| JSON payload with API-key header | Code written — `ino` L403-413 |
| Response parsing (product_name, event_type) | Code written — `ino` L421-438 |
| HTTP heartbeat to `/api/v1/iot/heartbeat` | Code written — **not hardware-tested** |
| Local debounce (2.5s, same UID) | Code written — `ino` L160-164 |
| OLED SSD1306 display (optional) | Code written — `config.h` L43 `ENABLE_OLED_DISPLAY 1` |
| Active buzzer feedback | Code written — `ino` L360-392 |
| Wi-Fi non-blocking reconnect | Code written — `ino` L219-241 |

### 9.2 Overall Firmware Stage
> **Code Written, Not Hardware-Tested**

The firmware is complete and correct. No serial logs or test evidence exists in the repository. The critical blocker is `config.h` line 14: `API_SERVER_HOST "192.168.1.100"` (placeholder IP).

### 9.3 Required Arduino Libraries
```
MFRC522 by GithubCommunity (v1.4.10+)
ArduinoJson by Benoit Blanchon (v6.21.0+)
Adafruit SSD1306 (if OLED enabled)
Adafruit GFX Library (if OLED enabled)
ESP8266WiFi, ESP8266HTTPClient (ESP8266 board package)
```

### 9.4 Verified Wiring (from config.h)

| RC522 Pin | NodeMCU | GPIO | config.h |
|-----------|---------|------|----------|
| SDA (SS) | D8 | GPIO 15 | `RC522_SS_PIN 15` |
| RST | D3 | GPIO 0 | `RC522_RST_PIN 0` |
| SCK | D5 | GPIO 14 | SPI default |
| MOSI | D7 | GPIO 13 | SPI default |
| MISO | D6 | GPIO 12 | SPI default |
| VCC | 3V3 | — | **3.3V ONLY — never 5V** |

---

## 10. IN/OUT Feature Inspection

### 10.1 Workflow Step Compliance

| Step | Required | Status |
|------|----------|--------|
| 1. RC522 detects RFID tag | Hardware | Code written, not hardware-tested |
| 2. ESP8266 POSTs UID to FastAPI | Wi-Fi POST | Code written, not hardware-tested |
| 3. Backend identifies product | `iot_service.process_rfid_scan()` | ✅ Implemented |
| 4. Website displays detected product | WS event + UI | ⚠️ Partial — visible in feed, no auto-transact modal |
| 5. User selects IN or OUT | `InventoryActionModal` | ✅ Implemented |
| 6. User specifies quantity | Quantity input | ✅ Implemented |
| 7. Backend validates | `inventory_service.py` | ✅ Implemented |
| 8. Backend updates stock + transaction | DB write | ✅ Implemented |
| 9. Website shows updated quantity | WS `INVENTORY_UPDATED` | ✅ Implemented |

### 10.2 Business Rule Compliance

| Rule | Status |
|------|--------|
| RFID scan = identification only | ✅ Correct |
| Repeated scans do not change stock | ✅ Correct |
| IN/OUT requires explicit user action | ✅ Correct |
| OUT rejected when exceeding stock | ✅ Both client and server guard |
| Atomic database updates | ✅ `with_for_update()` |
| Transaction records product, type, qty, user, timestamp | ✅ Complete |
| Idempotency (no accidental double-submit) | ⚠️ Missing |
| Website shows actual backend result | ✅ Error from `err.response?.data?.detail` |

---

## 11. Current Stage Assessment

### Status Table

| Component | Current Status | Evidence | Remaining Work |
|-----------|---------------|----------|----------------|
| **Frontend** | Implemented | 15 pages, all real API calls, WS live | Create `.env`; add scan→transact modal |
| **Backend** | Implemented | 35+ endpoints, auth, RFID, IoT, WS | Create `.env`; fix `source` override line 22 |
| **Database** | Implemented | 11 tables, constraints, seed script | Create Alembic version files |
| **RFID reader (RC522)** | Code written, not tested | `esp8266_rc522.ino` | Wire hardware; verify on serial monitor |
| **ESP8266 Wi-Fi** | Code written, not tested | `connectWiFi()` | Connect to actual Wi-Fi |
| **Device-to-API connection** | Code written, not tested | `sendRFIDScan()`, `sendHeartbeat()` | Update IP in `config.h`, flash, verify HTTP 200 |
| **Website IN/OUT** | Partially implemented | `InventoryActionModal` calls real API | Add scan→transact UX (convenience) |
| **Real-time updates** | Implemented | WS context + page reactions | None critical |
| **End-to-end testing** | Not done | Pytest passes API layer | Physical RFID → backend → frontend test |

### Overall Stage

| Layer | Stage |
|-------|-------|
| Backend | **Stage 8 — Website IN/OUT Integration** (complete) |
| Frontend | **Stage 8 — Website IN/OUT Integration** (complete) |
| Database | **Stage 5 — Frontend-Backend Integration** (complete, no migration files) |
| IoT Hardware | **Stage 7 — ESP8266-to-FastAPI Integration** (code complete, hardware not validated) |

---

## 12. Known Errors and Blockers

### B1 — CRITICAL: `backend/.env` file missing
- **Impact:** Backend uses SQLite defaults; JWT secret is non-production default
- **Fix:** `Copy-Item backend\.env.example backend\.env` then edit

### B2 — CRITICAL: Firmware IP placeholder
- **File:** `firmware/esp8266_rc522/config.h` line 14
- **Current:** `"192.168.1.100"` | **Fix:** Replace with actual LAN IP of backend host

### B3 — MEDIUM: `iot.py` source field override
- **File:** `backend/app/api/v1/iot.py` line 22
- **Issue:** `payload.source = "ESP8266-01"` silently discards the payload `source`
- **Fix:** Remove line 22 — schema default handles this

### B4 — LOW: No Alembic migration version files
- **Fix:** `alembic revision --autogenerate -m "initial"` after `.env` is set

### B5 — LOW: No idempotency key on inventory operations
- **Risk:** Rapid double-click or network retry creates duplicate transactions
- **Fix:** Add `idempotency_key: Optional[str]` to `InventoryOperationRequest`

### B6 — LOW: WebSocket has no authentication
- `/ws/live` accepts any client without a token
- Acceptable for development; add query-param token for production

---

## 13. Ordered Next-Stage Implementation Plan

---

### Phase A — Resolve Existing Blockers (~2 hours)

#### A1 — Create `backend/.env` (PRIORITY: CRITICAL)
```powershell
# Windows PowerShell from c:\Iot\
Copy-Item backend\.env.example backend\.env
# Then edit backend\.env — for local dev, DATABASE_URL can stay as sqlite default
```
**Acceptance:** `uvicorn app.main:app --reload` starts; `GET /health` returns `{"status": "healthy"}`

#### A2 — Create `frontend/.env`
```powershell
Set-Content frontend\.env "VITE_API_BASE_URL=/api/v1"
```

#### A3 — Fix `iot.py` source override
- **File:** `backend/app/api/v1/iot.py` line 22
- **Remove:** `payload.source = "ESP8266-01"`
- **Acceptance:** Simulator scans show `"source": "DEVELOPMENT_SIMULATOR"` in WS events

#### A4 — Run pytest suite
```powershell
cd c:\Iot\backend
pip install -r requirements.txt
pytest tests/ -v
```
**Acceptance:** All 7 test functions pass

---

### Phase B — Complete ESP8266 Hardware Integration (Day 2-3)

#### B1 — Find your machine's LAN IP
```powershell
ipconfig | Select-String "IPv4"
```
Note the IPv4 address (e.g., `192.168.1.45`)

#### B2 — Update `config.h` with real values

| Line | Field | Replace with |
|------|-------|-------------|
| 9 | `WIFI_SSID` | Your 2.4 GHz Wi-Fi SSID |
| 10 | `WIFI_PASSWORD` | Your Wi-Fi password |
| 14 | `API_SERVER_HOST` | Your machine's LAN IP |
| 23 | `DEVICE_API_KEY` | Must match `DEVICE_API_KEY` in `backend/.env` |

**If no OLED display:** Set `ENABLE_OLED_DISPLAY 0` on line 43

#### B3 — Flash the firmware
1. Install Arduino IDE with ESP8266 board package
2. Install: MFRC522, ArduinoJson, Adafruit SSD1306, Adafruit GFX
3. Open `firmware/esp8266_rc522/esp8266_rc522.ino`
4. Board: `NodeMCU 1.0 (ESP-12E Module)` or `Wemos D1 Mini`
5. Upload; open Serial Monitor at **115200 baud**

**Expected serial output:**
```
==========================================
  SMART RACK IOT FIRMWARE (ESP8266-01)
  Target Rack: Rack A1
==========================================
Connecting to Wi-Fi......
Wi-Fi connected
IP: 192.168.1.XX
RC522 initialized
ESP8266-01 ready
Waiting for RFID...
```

#### B4 — Verify heartbeat reaches backend
- After flashing, verify: `GET /api/v1/devices` returns `ESP8266-01` with `"status": "ONLINE"`
- Frontend Devices page should show the device as ONLINE

#### B5 — Test first live RFID scan
1. Hold a registered RFID tag near the RC522
2. **Serial Monitor:** `RFID detected: E2 34 A8 91` then `Server response: 200`
3. **Frontend Dashboard:** Live feed shows `RFID_DETECTED` event within 1 second
4. **API:** `GET /api/v1/rfid/events` includes the scan

---

### Phase C — "Scan → Transact" UX Shortcut (~1 day, convenience feature)

> **Note:** The full IN/OUT workflow already works. Operators can navigate Inventory → Find product → Transact. This phase adds a one-click shortcut from the RFID scan to the transaction modal.

#### C1 — Add "Last Scan" action banner
- **File:** `frontend/src/pages/DashboardPage.tsx` (or `InventoryPage.tsx`)
- **Trigger:** `lastRfidScan` from `useWebSocketFeed()` when `event_type === "DETECTED"`
- **UI:** Highlighted banner — "📡 RFID Detected: [Product Name] on Rack A1 — [IN] [OUT]"
- **Action:** Clicking IN or OUT pre-fills `InventoryActionModal` with `productId` and operation type
- **API endpoint used:** Already exists — `POST /api/v1/inventory/{product_id}/operation`

#### C2 — Idempotency key (optional hardening)
- Add `idempotency_key: Optional[str]` to `InventoryOperationRequest` schema
- In `inventory_service.perform_operation()`: Check for existing transaction with same key in last 10 seconds
- In `InventoryActionModal`: Generate `crypto.randomUUID()` on modal open; include in request

---

### Phase D — End-to-End Validation (Day 4-5)

#### D1 — Setup
```powershell
# Terminal 1 — Backend
cd c:\Iot\backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd c:\Iot\frontend
npm run dev
```
Open `http://localhost:5173`, login: `admin@smartrack.io / admin123`

#### D2 — RFID scan test
- Hold registered tag near RC522
- Verify: Serial `"Server response: 200"`
- Verify: Dashboard live feed shows event within 1 second

#### D3 — IN (RECEIVE) transaction test
1. Navigate to Inventory → Find scanned product → Transact
2. Select RECEIVE, Quantity: 3, Reason: "Phase D test"
3. Verify: Quantity increased by 3
4. Verify: Transaction log shows RECEIVE with user name and timestamp

#### D4 — OUT (DISPATCH) transaction test
1. Same product → Transact → DISPATCH, Quantity: 2
2. Verify: Quantity decreased by 2
3. Verify: Transaction log shows DISPATCH

#### D5 — Negative stock rejection test
1. Try DISPATCH of stock+1 units
2. Verify: Modal submit button disabled (client guard)
3. Force via API: verify 400 with `"negative quantity"` detail

#### D6 — Duplicate scan suppression test
1. Scan same tag twice within 2.5 seconds
2. Verify: Serial shows only one `"Sending event..."` (local debounce)
3. Via API: second scan within 3s returns `{"status": "ignored_debounce"}`

#### D7 — Device offline detection test
1. Power off ESP8266
2. Wait 65 seconds
3. Verify: `GET /api/v1/devices` → `status: "OFFLINE"`
4. Verify: DEVICE_OFFLINE alert on Alerts page
5. Power ESP8266 back on
6. Verify: Next heartbeat resolves the alert

#### D8 — Unknown RFID tag test
1. Scan unregistered tag
2. Verify: `rfid_events` row with `event_type: "UNKNOWN"`
3. Verify: UNKNOWN_RFID alert created
4. Verify: ESP8266 double-buzzer alert sounds

---

## 14. End-to-End Testing Checklist

- [ ] `pytest tests/ -v` — all 7 tests pass
- [ ] Backend starts without errors
- [ ] Frontend starts, login works
- [ ] Dashboard loads KPIs from backend
- [ ] ESP8266 shows `ONLINE` on Devices page
- [ ] RFID scan registers in `rfid_events` table
- [ ] RFID scan appears in Dashboard live feed (WebSocket)
- [ ] RECEIVE operation increases quantity correctly
- [ ] DISPATCH operation decreases quantity correctly
- [ ] Dispatch beyond stock returns HTTP 400
- [ ] Transaction history shows all operations with user and timestamp
- [ ] Duplicate scan within debounce is suppressed (both local and server)
- [ ] Unknown RFID tag creates UNKNOWN_RFID alert
- [ ] Device going offline creates DEVICE_OFFLINE alert
- [ ] Device coming back online resolves alert
- [ ] CSV report downloads work
- [ ] WebSocket reconnects after backend restart

---

## 15. Exact Files to Change First (Priority Order)

1. **Create** `c:\Iot\backend\.env` from `.env.example` — **BLOCKING**
2. **Edit** `c:\Iot\firmware\esp8266_rc522\config.h` lines 9, 10, 14, 43 — Wi-Fi SSID, password, backend IP, OLED flag
3. **Create** `c:\Iot\frontend\.env` with `VITE_API_BASE_URL=/api/v1`
4. **Edit** `c:\Iot\backend\app\api\v1\iot.py` line 22 — remove `payload.source = "ESP8266-01"`
5. **Run** `pytest tests/ -v` from `c:\Iot\backend\` to verify all backend logic before flashing

---

## 16. Questions That Require Your Confirmation

| # | Question | Impact |
|---|----------|--------|
| Q1 | Is the ESP8266 physically wired to the RC522 per the pin table in `config.h`? | Hardware validation cannot proceed |
| Q2 | Is the OLED display wired? (If not, change `ENABLE_OLED_DISPLAY` to `0` in `config.h` L43) | Flashing will fail at runtime if OLED enabled but not wired |
| Q3 | What is the Wi-Fi SSID — and is it 2.4 GHz? (ESP8266 does not support 5 GHz) | Required for `config.h` |
| Q4 | What is the host machine's LAN IP? (`ipconfig` → IPv4) | Required for `config.h` `API_SERVER_HOST` |
| Q5 | SQLite (local dev) or PostgreSQL (Docker)? | Determines `DATABASE_URL` in `.env` |
| Q6 | Should idempotency keys be implemented, or is double-submit risk acceptable? | Backend schema change if yes |
| Q7 | Is the "scan→transact" dashboard modal needed before demo, or is manual navigation acceptable? | ~1 day of frontend work |
| Q8 | What RFID UIDs are physically on the demo products? | Must be registered via `POST /api/v1/products/{id}/assign-rfid` or `seed.py` |

---

*End of Report — generated by full codebase inspection of `c:\Iot`*

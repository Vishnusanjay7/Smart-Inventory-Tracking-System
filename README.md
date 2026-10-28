# IoT Smart Rack Inventory Management System

An enterprise-grade, end-to-end **IoT Smart Rack Inventory Management System** connecting physical **ESP8266 microcontrollers + RC522 13.56 MHz RFID readers** deployed on **Rack A1** to a **FastAPI backend**, **PostgreSQL database**, and a **React + TypeScript web application** with live **WebSocket** streaming.

---

## 1. Physical Hardware Configuration

Current Physical Deployment:
* **1 × NodeMCU ESP8266** (`ESP8266-01`)
* **1 × RC522 13.56 MHz RFID Reader** (`RC522-01`)
* **RFID stickers/tags** attached manually to tracked products
* **1 × Physical Warehouse Rack** (`Rack A1`)
* *Optional peripherals*: SSD1306 0.96" I2C OLED display, piezo buzzer, green/red status LEDs

```text
ESP8266-01  ──(SPI)──>  RC522-01  ──(Mounted)──>  Rack A1
```

*The database and API architecture are designed to scale to future racks (`Rack A2`, `Rack A3`) without redesign.*

---

## 2. End-to-End System Architecture

```text
[ Physical RFID Tag on Item ]
             │
             ▼ (13.56 MHz SPI)
[ RC522 RFID Reader (RC522-01) ]
             │
             ▼ (SPI Bus: D5/D6/D7/D8)
[ ESP8266 NodeMCU (ESP8266-01) ]  <── Optional: SSD1306 OLED (I2C) & Active Buzzer
             │
             ▼ (Wi-Fi 802.11 b/g/n / REST API with X-Device-API-Key)
[ FastAPI Backend (/api/v1/iot/rfid & /api/v1/iot/heartbeat) ]
             │
    ┌────────┴──────────────────────────┐
    ▼                                   ▼
[ PostgreSQL Database ]       [ WebSocket Hub / SSE ]
 (Atomic Transactions,         (Real-time event broadcast:
  RFID mapping, Audits,         RFID scans, Alerts, Devices)
  Products, Devices, Alerts)            │
                                        ▼
                           [ React + TypeScript Web App ]
                           - Live Warehouse Dashboard
                           - Product Catalog & RFID Assignment
                           - Atomic Inventory Operations
                           - Rack A1 Visualization
                           - Transaction Audit History
                           - Real Analytics & Demand Forecast
                           - Device & Heartbeat Monitor
                           - Development Simulator (Demarcated)
```

---

## 3. Core Business Principles & Features

1. **RFID Detection vs. Inventory Transaction**:
   - Merely detecting or resting a tag on the RC522 reader **never** blindly modifies stock levels.
   - Authorized operators execute explicit stock transactions (`RECEIVE`, `ADD`, `REMOVE`, `DISPATCH`, `RETURN`, `DAMAGE`, `ADJUSTMENT`) with an immutable audit log.
2. **Debounce & Storm Prevention**:
   - Configurable 3.0s sliding debounce cache suppresses duplicate detection events when items rest on the antenna.
3. **Real-Time Live Feed**:
   - WebSocket streaming pushes RFID detections, inventory movements, and offline alerts to all active dashboards instantly without browser refresh.
4. **Demand Forecasting**:
   - Built-in analytics service calculates daily usage from real transaction history. If insufficient history exists (< 3 days), it returns an honest fallback notice without fabricating data.
5. **Role-Based Access Control (RBAC)**:
   - Built-in roles: `ADMIN`, `MANAGER`, `STAFF`.

---

## 4. Hardware Wiring Pinout (NodeMCU to RC522)

| RC522 Pin | NodeMCU Pin | GPIO | Function | Description |
| :--- | :--- | :--- | :--- | :--- |
| **VCC** | `3V3` | 3.3V | Power Supply | **3.3V ONLY (DO NOT USE 5V)** |
| **RST** | `D3` | `GPIO 0` | Reset | Configurable in `config.h` |
| **GND** | `GND` | GND | Ground | Ground |
| **MISO** | `D6` | `GPIO 12`| SPI MISO | SPI Master In Slave Out |
| **MOSI** | `D7` | `GPIO 13`| SPI MOSI | SPI Master Out Slave In |
| **SCK** | `D5` | `GPIO 14`| SPI SCK | SPI Clock |
| **SDA (SS)** | `D8` | `GPIO 15`| SPI SS | Chip Select |

*See [docs/hardware.md](file:///c:/Iot/docs/hardware.md) for full wiring tables and OLED / Buzzer configurations.*

---

## 5. Quick Start (Local & Docker)

### Option A: Docker Compose (Full Stack)

```bash
docker-compose up -d --build
```
- Web Application: `http://localhost` (or `http://localhost:3000`)
- FastAPI Swagger Docs: `http://localhost:8000/docs`

### Option B: Local Development

#### 1. Backend:
```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Pre-Seeded Authorized Users:
- **Admin**: `admin@smartrack.io` / `admin123`
- **Manager**: `manager@smartrack.io` / `manager123`
- **Staff**: `staff@smartrack.io` / `staff123`

---

## 6. Automated Test Suite

Run the full pytest suite:

```bash
pytest backend/tests -v
```

---

## 7. Project Structure

```text
c:\Iot\
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST API endpoints (auth, products, inventory, iot, etc.)
│   │   ├── core/            # Config, security, database, logging
│   │   ├── models/          # SQLAlchemy relational models
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # Business logic & atomic transaction handlers
│   │   ├── websocket/       # Real-time WebSocket connection manager
│   │   └── main.py          # FastAPI application factory & lifespan
│   ├── migrations/          # Alembic database migrations
│   ├── tests/               # Pytest automated test suite
│   ├── seed.py              # Initial database seeder
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed Axios client
│   │   ├── components/      # Reusable UI & Modals (Inventory, RFID Capture)
│   │   ├── context/         # AuthContext & WebSocketContext
│   │   ├── pages/           # Dashboard, Products, Inventory, RFID, Rack, Devices, etc.
│   │   └── styles/          # Enterprise CSS design system
│   ├── package.json
│   └── vite.config.ts
│
├── firmware/
│   └── esp8266_rc522/
│       ├── config.h         # Pinouts, Wi-Fi credentials, API endpoints
│       └── esp8266_rc522.ino# Complete Arduino firmware with OLED/Buzzer support
│
├── docs/
│   ├── architecture.md      # Architecture diagrams & sequence flows
│   ├── hardware.md          # Wiring diagrams & pinout references
│   ├── api.md               # Complete REST & WebSocket API specification
│   └── deployment.md        # Local, Docker, and hardware deployment guide
│
├── docker-compose.yml       # Production Docker orchestration
└── README.md
```

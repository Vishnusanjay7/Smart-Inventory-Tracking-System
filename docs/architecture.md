# Smart Rack IoT Inventory System - Architecture Specification

## 1. System Overview

The **IoT Smart Rack Inventory Management System** bridges physical warehouse storage racks with enterprise web applications via an ESP8266 Wi-Fi micro-controller and an RC522 13.56 MHz high-frequency RFID reader.

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

## 2. Hardware Topology & Hierarchy

The physical deployment is structured as a hierarchical topology:

```text
Rack A1 (Primary Storage Bay)
   │
   └── RC522-01 (13.56 MHz SPI Reader)
          │
          └── ESP8266-01 (NodeMCU Wi-Fi Gateway)
```

The database schema and API endpoints are natively architected to scale horizontally to additional physical racks in the future (`Rack A2 -> RC522-02 -> ESP8266-02`, etc.) without schema alterations.

---

## 3. Core Business Principles

### A. RFID Detection vs. Inventory Transaction (Rule 7, 8, 27)
- **RFID Detection**: Represents the physical proximity event: *"Tag `E234A891` was detected by Reader RC522-01 on Rack A1."*
- **Inventory Transaction**: Represents an authorized stock alteration (*"Operator received +5 units of Laptop LAP001 on Rack A1"*).
- **Critical Rule**: Merely scanning or resting an RFID tag on the reader **never** blindly modifies inventory quantity. This prevents runaway duplicate counts.

### B. Hardware Debounce & Duplicate Suppression
- The backend maintains an in-memory sliding debounce cache (`settings.RFID_DEBOUNCE_SECONDS = 3.0s`).
- Scans matching `(device_id, reader_id, uid)` within the debounce window are recorded once and subsequent duplicate triggers are suppressed.

### C. Atomic Inventory Consistency
- Every stock modification is wrapped in an atomic database transaction.
- Prevented negative quantities: An attempt to dispatch or remove more stock than is currently physically on-hand immediately raises a `400 Bad Request` rollback.
- Stock changes create an immutable `inventory_transactions` record for complete auditing.

---

## 4. Sequence Diagrams

### A. Real-Time RFID Tag Scan Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Warehouse Staff
    participant Tag as RFID Sticker
    participant RC as RC522 Reader (RC522-01)
    participant ESP as ESP8266 (ESP8266-01)
    participant API as FastAPI Backend
    participant DB as PostgreSQL DB
    participant WS as WebSocket Hub
    participant UI as React Dashboard

    Staff->>RC: Taps RFID Tag near Antenna
    RC->>ESP: Transmits UID via SPI Bus (e.g., E2 34 A8 91)
    ESP->>ESP: Normalizes UID to E234A891 & checks local debounce
    ESP->>API: POST /api/v1/iot/rfid (Header: X-Device-API-Key)
    API->>API: Validates Device API Key
    API->>DB: Queries rfid_tags table for mapped Product
    alt Tag is Registered
        DB-->>API: Returns Product (LAP001 - Laptop)
        API->>DB: Inserts rfid_events record (DETECTED)
        API->>WS: Broadcasts RFID_DETECTED payload
        WS-->>UI: Real-Time Live Notification Popup
        API-->>ESP: HTTP 200 OK (Product: "LAP001")
        ESP->>Staff: Beep (100ms) + OLED Displays "LAP001"
    else Tag is Unknown
        API->>DB: Inserts rfid_events record (UNKNOWN)
        API->>DB: Creates Alert (UNKNOWN_RFID, Warning)
        API->>WS: Broadcasts ALERT_TRIGGERED payload
        WS-->>UI: Alert Notification on Dashboard
        API-->>ESP: HTTP 200 OK (Event: UNKNOWN)
        ESP->>Staff: Double Beep (Alert) + OLED Displays "UNKNOWN RFID"
    end
```

### B. Device Heartbeat & Offline Watchdog Flow

```mermaid
sequenceDiagram
    autonumber
    participant ESP as ESP8266-01
    participant API as FastAPI Backend
    participant DB as PostgreSQL DB
    participant Watchdog as Background Heartbeat Loop
    participant WS as WebSocket Hub
    participant UI as React Dashboard

    loop Every 30 Seconds
        ESP->>API: POST /api/v1/iot/heartbeat (IP, Uptime, Firmware)
        API->>DB: Updates Device & Reader last_heartbeat = now()
        API->>DB: Resolves any active DEVICE_OFFLINE alerts
        API->>WS: Broadcasts DEVICE_HEARTBEAT
        WS-->>UI: Updates Device Status: ONLINE
        API-->>ESP: HTTP 200 OK
    end

    Note over ESP,API: Wi-Fi or Power Disconnect Occurs
    loop Every 15 Seconds
        Watchdog->>DB: Evaluates devices where (now - last_heartbeat) > 60s
        DB-->>Watchdog: ESP8266-01 exceeded threshold
        Watchdog->>DB: Sets Device status = OFFLINE, Reader = DISCONNECTED
        Watchdog->>DB: Creates Alert (DEVICE_OFFLINE, Critical)
        Watchdog->>WS: Broadcasts DEVICE_OFFLINE & ALERT_TRIGGERED
        WS-->>UI: Dashboard immediately flags ESP8266-01 as OFFLINE
    end
```

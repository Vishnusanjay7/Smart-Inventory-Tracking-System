# Smart Rack IoT Inventory System - Deployment Guide

This guide describes how to run and deploy the complete system locally, via Docker Compose, and on physical hardware.

---

## 1. Quick Start with Docker Compose (Production Ready)

The simplest and most robust deployment method is Docker Compose, which automatically orchestrates PostgreSQL 15, FastAPI, and the Nginx-served React frontend:

```bash
# 1. Clone or navigate to the project directory
cd c:\Iot

# 2. Build and start all services
docker-compose up -d --build

# 3. Verify container health
docker-compose ps
```

Once running:
- **Web Dashboard**: Open `http://localhost` (or `http://localhost:3000`)
- **FastAPI REST API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **PostgreSQL Database**: Port `5432` (`smartrack_db`)

Default Administrator Credentials:
- **Email**: `admin@smartrack.io`
- **Password**: `admin123`

---

## 2. Local Development Setup

### A. Backend Setup (Python 3.11 + FastAPI)

```bash
cd c:\Iot\backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Seed initial hardware & database records
python seed.py

# 3. Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### B. Frontend Setup (React + Vite + TypeScript)

```bash
cd c:\Iot\frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 3. Physical Hardware Deployment (ESP8266 + RC522)

1. Connect the RC522 SPI pins to the NodeMCU ESP8266 as detailed in [docs/hardware.md](file:///c:/Iot/docs/hardware.md).
2. Open `firmware/esp8266_rc522/config.h`:
   - Set `WIFI_SSID` and `WIFI_PASSWORD` to your local 2.4 GHz Wi-Fi network.
   - Set `API_SERVER_HOST` to the LAN IP of your computer running the FastAPI backend (e.g. `192.168.1.100`).
3. Flash the firmware via Arduino IDE.
4. Open the Serial Monitor at **115200 baud**.
5. Once connected, scan any physical RFID sticker:
   - The ESP8266 will post the event to `http://<SERVER_IP>:8000/api/v1/iot/rfid`.
   - The web dashboard will immediately receive the event over WebSocket.

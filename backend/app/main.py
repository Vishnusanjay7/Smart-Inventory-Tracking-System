import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging_config import setup_logging, logger
from app.core.database import engine, Base, SessionLocal
from app.api.v1 import api_router
from app.websocket.manager import ws_manager
from app.services.device_service import device_service

# Initialize logging
setup_logging()

async def device_heartbeat_monitor_loop():
    """Background task to periodically evaluate IoT devices for missed heartbeats."""
    logger.info("Starting IoT Device Heartbeat Monitor daemon...")
    while True:
        try:
            await asyncio.sleep(15)
            db = SessionLocal()
            try:
                await device_service.check_device_timeouts(db)
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("IoT Device Heartbeat Monitor stopped.")
            break
        except Exception as e:
            logger.error(f"Error in device heartbeat monitor: {e}", exc_info=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Smart Rack Database tables...")
    Base.metadata.create_all(bind=engine)

    # Start background heartbeat watchdog
    monitor_task = asyncio.create_task(device_heartbeat_monitor_loop())
    
    yield

    # Clean shutdown
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass
    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
# IoT Smart Rack Inventory Management System API

Enterprise REST and Real-Time WebSocket backend connecting physical **ESP8266 + RC522 RFID readers** 
mounted on physical warehouse racks (Rack A1) to PostgreSQL, tracking product inventory, transactions, 
alerts, and hardware health.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development and flexible device connections
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

# Real-Time WebSocket Endpoint
@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive
            data = await websocket.receive_text()
            # Client can send ping
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

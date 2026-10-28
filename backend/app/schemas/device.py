from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.device import DeviceStatus, ReaderStatus

class ReaderResponse(BaseModel):
    id: int
    reader_id: str
    device_id: str
    rack_id: int
    rack_code: Optional[str] = None
    status: ReaderStatus
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DeviceResponse(BaseModel):
    id: int
    device_id: str
    type: str
    status: DeviceStatus
    ip_address: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    firmware_version: str
    uptime_seconds: int
    readers: List[ReaderResponse] = []

    model_config = ConfigDict(from_attributes=True)

class HeartbeatRequest(BaseModel):
    device_id: str = Field(..., description="Device ID e.g. ESP8266-01")
    reader_id: Optional[str] = Field("RC522-01", description="Associated reader ID")
    ip_address: Optional[str] = Field(None, description="Current local IP address")
    firmware_version: Optional[str] = Field("1.0.0", description="Current firmware build")
    uptime_seconds: Optional[int] = Field(0, description="Uptime in seconds")

class HeartbeatResponse(BaseModel):
    status: str = "ok"
    server_time: datetime
    device_id: str
    device_status: DeviceStatus

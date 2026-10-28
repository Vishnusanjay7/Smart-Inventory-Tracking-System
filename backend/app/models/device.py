import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class DeviceStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"

class ReaderStatus(str, enum.Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. ESP8266-01
    type = Column(String(50), default="ESP8266", nullable=False)
    status = Column(SAEnum(DeviceStatus), default=DeviceStatus.OFFLINE, nullable=False)
    ip_address = Column(String(50), nullable=True)
    last_heartbeat = Column(DateTime, nullable=True)
    firmware_version = Column(String(50), default="1.0.0", nullable=False)
    uptime_seconds = Column(Integer, default=0, nullable=False)

    readers = relationship("Reader", back_populates="device")
    alerts = relationship("Alert", back_populates="device")

class Reader(Base):
    __tablename__ = "readers"

    id = Column(Integer, primary_key=True, index=True)
    reader_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. RC522-01
    device_id = Column(String(50), ForeignKey("devices.device_id"), nullable=False)
    rack_id = Column(Integer, ForeignKey("racks.id"), nullable=False)
    status = Column(SAEnum(ReaderStatus), default=ReaderStatus.CONNECTED, nullable=False)
    last_seen = Column(DateTime, nullable=True)

    device = relationship("Device", back_populates="readers")
    rack = relationship("Rack", back_populates="readers")

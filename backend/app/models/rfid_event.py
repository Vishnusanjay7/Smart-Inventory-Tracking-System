import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class RFIDEventType(str, enum.Enum):
    DETECTED = "DETECTED"
    UNKNOWN = "UNKNOWN"
    REGISTER = "REGISTER"

class RFIDEvent(Base):
    __tablename__ = "rfid_events"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(50), index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    reader_id = Column(String(50), nullable=False)
    device_id = Column(String(50), nullable=False)
    rack_id = Column(Integer, ForeignKey("racks.id"), nullable=True)
    event_type = Column(SAEnum(RFIDEventType), default=RFIDEventType.DETECTED, nullable=False)
    source = Column(String(50), default="ESP8266-01", nullable=False) # e.g. ESP8266-01 or DEVELOPMENT_SIMULATOR
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    product = relationship("Product", back_populates="rfid_events")
    rack = relationship("Rack", back_populates="rfid_events")

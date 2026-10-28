import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class AlertType(str, enum.Enum):
    LOW_STOCK = "LOW_STOCK"
    CRITICAL_STOCK = "CRITICAL_STOCK"
    UNKNOWN_RFID = "UNKNOWN_RFID"
    DEVICE_OFFLINE = "DEVICE_OFFLINE"
    READER_OFFLINE = "READER_OFFLINE"
    INVALID_EVENT = "INVALID_EVENT"

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class AlertStatus(str, enum.Enum):
    UNRESOLVED = "UNRESOLVED"
    RESOLVED = "RESOLVED"

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(SAEnum(AlertType), nullable=False)
    severity = Column(SAEnum(AlertSeverity), default=AlertSeverity.WARNING, nullable=False)
    message = Column(Text, nullable=False)
    related_product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    related_device_id = Column(String(50), ForeignKey("devices.device_id"), nullable=True)
    status = Column(SAEnum(AlertStatus), default=AlertStatus.UNRESOLVED, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    product = relationship("Product")
    device = relationship("Device", back_populates="alerts")
    resolver = relationship("User")

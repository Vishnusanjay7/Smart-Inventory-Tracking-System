import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class TagStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    UNASSIGNED = "UNASSIGNED"

class RFIDTag(Base):
    __tablename__ = "rfid_tags"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(50), unique=True, index=True, nullable=False) # Normalized hex e.g. E234A891
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    status = Column(SAEnum(TagStatus), default=TagStatus.ACTIVE, nullable=False)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)
    unassigned_at = Column(DateTime, nullable=True)

    product = relationship("Product", back_populates="rfid_tags")

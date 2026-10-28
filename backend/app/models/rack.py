import enum
from sqlalchemy import Column, Integer, String, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class RackStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"
    INACTIVE = "INACTIVE"

class Rack(Base):
    __tablename__ = "racks"

    id = Column(Integer, primary_key=True, index=True)
    rack_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. A1, A2
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(RackStatus), default=RackStatus.ACTIVE, nullable=False)

    readers = relationship("Reader", back_populates="rack")
    inventory_items = relationship("Inventory", back_populates="rack")
    transactions = relationship("InventoryTransaction", back_populates="rack")
    rfid_events = relationship("RFIDEvent", back_populates="rack")

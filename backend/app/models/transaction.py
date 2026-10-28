import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class TransactionType(str, enum.Enum):
    RECEIVE = "RECEIVE"
    ADD = "ADD"
    REMOVE = "REMOVE"
    DISPATCH = "DISPATCH"
    RETURN = "RETURN"
    DAMAGE = "DAMAGE"
    ADJUSTMENT = "ADJUSTMENT"

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rack_id = Column(Integer, ForeignKey("racks.id"), nullable=False)
    type = Column(SAEnum(TransactionType), nullable=False)
    quantity_change = Column(Integer, nullable=False) # e.g. +5 or -2
    previous_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)

    product = relationship("Product", back_populates="transactions")
    rack = relationship("Rack", back_populates="transactions")
    user = relationship("User")

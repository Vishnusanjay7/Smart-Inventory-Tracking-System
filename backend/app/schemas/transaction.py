from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.transaction import TransactionType

class TransactionResponse(BaseModel):
    id: int
    product_id: int
    product_code: str
    product_name: str
    rfid_uid: Optional[str] = None
    rack_id: int
    rack_code: str
    type: TransactionType
    quantity_change: int
    previous_quantity: int
    new_quantity: int
    reason: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TransactionFilter(BaseModel):
    product_id: Optional[int] = None
    rack_id: Optional[int] = None
    type: Optional[TransactionType] = None
    user_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

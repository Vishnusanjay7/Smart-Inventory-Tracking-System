from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.transaction import TransactionType

class InventoryResponse(BaseModel):
    id: int
    product_id: int
    product_code: str
    product_name: str
    category_name: Optional[str] = None
    rfid_uid: Optional[str] = None
    rack_id: int
    rack_code: str
    quantity: int
    minimum_stock: int
    stock_status: str # OK, LOW, CRITICAL, OUT_OF_STOCK
    last_detected: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InventoryOperationRequest(BaseModel):
    type: TransactionType = Field(..., description="Operation: RECEIVE, ADD, REMOVE, DISPATCH, RETURN, DAMAGE, ADJUSTMENT")
    quantity: int = Field(..., ge=1, description="Quantity to apply (must be >= 1)")
    reason: Optional[str] = Field(None, description="Reason for adjustment or transaction")
    rack_code: Optional[str] = Field("A1", description="Rack where operation occurs")
    idempotency_key: Optional[str] = Field(None, description="Optional client idempotency key to prevent double submits")

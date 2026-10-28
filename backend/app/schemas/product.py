from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryResponse
from app.schemas.rfid_tag import RFIDTagResponse

class ProductBase(BaseModel):
    product_id: str = Field(..., description="Unique product SKU/code e.g. LAP001")
    name: str
    category_id: Optional[int] = None
    description: Optional[str] = None
    supplier: Optional[str] = None
    unit: str = "pcs"
    minimum_stock: int = 5
    image_url: Optional[str] = None
    active: bool = True

class ProductCreate(ProductBase):
    rfid_uid: Optional[str] = Field(None, description="Optional RFID UID to associate during registration")
    initial_quantity: int = Field(0, ge=0, description="Initial stock quantity")
    rack_code: str = Field(default="A1", description="Default rack placement")

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    supplier: Optional[str] = None
    unit: Optional[str] = None
    minimum_stock: Optional[int] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None

class ProductAssignRfid(BaseModel):
    rfid_uid: str = Field(..., description="RFID UID string e.g. E234A891")

class ProductReassignRfid(BaseModel):
    rfid_uid: str = Field(..., description="RFID UID to reassign")
    confirm: bool = Field(True, description="Explicit confirmation of reassignment from existing product")

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    current_quantity: int = 0
    rack_code: str = "A1"
    rfid_uid: Optional[str] = None
    stock_status: str = "OK" # OK, LOW, CRITICAL, OUT_OF_STOCK
    last_detected: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ProductDetailResponse(ProductResponse):
    rfid_tags: List[RFIDTagResponse] = []

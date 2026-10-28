from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.rfid_tag import TagStatus

class RFIDTagBase(BaseModel):
    uid: str
    status: TagStatus = TagStatus.ACTIVE

class RFIDTagCreate(RFIDTagBase):
    product_id: Optional[int] = None

class RFIDTagResponse(RFIDTagBase):
    id: int
    product_id: Optional[int] = None
    assigned_at: Optional[datetime] = None
    unassigned_at: Optional[datetime] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

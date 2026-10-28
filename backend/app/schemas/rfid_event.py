from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.rfid_event import RFIDEventType

class RFIDEventCreate(BaseModel):
    device_id: str = Field(..., description="ESP8266 Device ID e.g. ESP8266-01")
    reader_id: str = Field(..., description="RC522 Reader ID e.g. RC522-01")
    rfid_uid: str = Field(..., description="RFID Tag UID hex string e.g. E234A891 or E2 34 A8 91")
    timestamp: Optional[datetime] = Field(None, description="Client timestamp")
    source: Optional[str] = Field("ESP8266-01", description="Event source origin")

class RFIDEventResponse(BaseModel):
    id: int
    uid: str
    product_id: Optional[int] = None
    product_code: Optional[str] = None
    product_name: Optional[str] = None
    reader_id: str
    device_id: str
    rack_id: Optional[int] = None
    rack_code: Optional[str] = None
    event_type: RFIDEventType
    source: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

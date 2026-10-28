from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.rack import RackStatus

class RackBase(BaseModel):
    rack_code: str
    name: str
    description: Optional[str] = None
    status: RackStatus = RackStatus.ACTIVE

class RackCreate(RackBase):
    pass

class RackResponse(RackBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

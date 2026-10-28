from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.alert import AlertType, AlertSeverity, AlertStatus

class AlertResponse(BaseModel):
    id: int
    type: AlertType
    severity: AlertSeverity
    message: str
    related_product_id: Optional[int] = None
    product_name: Optional[str] = None
    related_device_id: Optional[str] = None
    status: AlertStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolver_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AlertResolveRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Optional note or resolution details")

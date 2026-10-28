from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.alert import AlertStatus, AlertSeverity
from app.models.user import User
from app.schemas.alert import AlertResponse, AlertResolveRequest
from app.services.alert_service import alert_service
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    status: Optional[AlertStatus] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return alert_service.list_alerts(
        db, status_filter=status, severity_filter=severity,
        skip=skip, limit=limit
    )

@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: int,
    payload: AlertResolveRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reason = payload.reason if payload else None
    al = await alert_service.resolve_alert(db, alert_id, user_id=current_user.id, reason=reason)
    return AlertResponse(
        id=al.id,
        type=al.type,
        severity=al.severity,
        message=al.message,
        related_product_id=al.related_product_id,
        product_name=al.product.name if al.product else None,
        related_device_id=al.related_device_id,
        status=al.status,
        created_at=al.created_at,
        resolved_at=al.resolved_at,
        resolved_by=al.resolved_by,
        resolver_name=current_user.name
    )

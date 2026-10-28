from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.alert import Alert, AlertStatus, AlertType, AlertSeverity
from app.models.user import User
from app.websocket.manager import ws_manager

class AlertService:
    @staticmethod
    def list_alerts(
        db: Session,
        status_filter: Optional[AlertStatus] = None,
        severity_filter: Optional[AlertSeverity] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        query = db.query(Alert)
        if status_filter:
            query = query.filter(Alert.status == status_filter)
        if severity_filter:
            query = query.filter(Alert.severity == severity_filter)

        alerts = query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()
        results = []
        for a in alerts:
            results.append({
                "id": a.id,
                "type": a.type,
                "severity": a.severity,
                "message": a.message,
                "related_product_id": a.related_product_id,
                "product_name": a.product.name if a.product else None,
                "related_device_id": a.related_device_id,
                "status": a.status,
                "created_at": a.created_at,
                "resolved_at": a.resolved_at,
                "resolved_by": a.resolved_by,
                "resolver_name": a.resolver.name if a.resolver else None
            })
        return results

    @staticmethod
    async def resolve_alert(db: Session, alert_id: int, user_id: int, reason: Optional[str] = None) -> Alert:
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = user_id
        if reason:
            alert.message = f"{alert.message} | Resolution Note: {reason}"

        db.commit()
        db.refresh(alert)

        resolver = db.query(User).filter(User.id == user_id).first()

        await ws_manager.broadcast("ALERT_RESOLVED", {
            "id": alert.id,
            "resolved_at": str(alert.resolved_at),
            "resolver_name": resolver.name if resolver else "Admin"
        })

        return alert

alert_service = AlertService()

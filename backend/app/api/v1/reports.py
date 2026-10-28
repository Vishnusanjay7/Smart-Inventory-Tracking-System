from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.report_service import report_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/inventory/csv")
def download_inventory_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_content = report_service.generate_inventory_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_report.csv"}
    )

@router.get("/transactions/csv")
def download_transactions_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_content = report_service.generate_transactions_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions_audit_report.csv"}
    )

@router.get("/rfid-activity/csv")
def download_rfid_activity_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_content = report_service.generate_rfid_activity_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rfid_activity_report.csv"}
    )

@router.get("/low-stock/csv")
def download_low_stock_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_content = report_service.generate_low_stock_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=low_stock_report.csv"}
    )

@router.get("/device-status/csv")
def download_device_status_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_content = report_service.generate_device_status_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=device_status_report.csv"}
    )

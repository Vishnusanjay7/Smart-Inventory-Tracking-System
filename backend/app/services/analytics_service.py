from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.product import Product
from app.models.category import Category
from app.models.inventory import Inventory
from app.models.rfid_tag import RFIDTag, TagStatus
from app.models.transaction import InventoryTransaction, TransactionType
from app.models.rfid_event import RFIDEvent
from app.models.alert import Alert, AlertStatus
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CategoryStockSummary,
    DailyStockChange,
    TopActiveProduct,
    DemandForecastItem
)
from app.core.config import settings

class AnalyticsService:
    @staticmethod
    def get_summary(db: Session) -> AnalyticsSummaryResponse:
        # Total products
        total_products = db.query(func.count(Product.id)).filter(Product.active == True).scalar() or 0

        # Total quantity across all racks
        total_quantity = db.query(func.sum(Inventory.quantity)).scalar() or 0

        # Stock status counts
        low_stock_count = 0
        critical_stock_count = 0
        active_products = db.query(Product).filter(Product.active == True).all()
        for p in active_products:
            inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
            qty = inv.quantity if inv else 0
            if qty <= settings.CRITICAL_STOCK_DEFAULT:
                critical_stock_count += 1
            elif qty <= p.minimum_stock:
                low_stock_count += 1

        # Active RFID Tags
        active_tags = db.query(func.count(RFIDTag.id)).filter(RFIDTag.status == TagStatus.ACTIVE).scalar() or 0

        # Today start time
        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        # Today's transactions
        today_tx = db.query(func.count(InventoryTransaction.id)).filter(
            InventoryTransaction.created_at >= today_start
        ).scalar() or 0

        # Today's RFID scans
        today_scans = db.query(func.count(RFIDEvent.id)).filter(
            RFIDEvent.timestamp >= today_start
        ).scalar() or 0

        # Unresolved alerts
        unresolved_alerts = db.query(func.count(Alert.id)).filter(
            Alert.status == AlertStatus.UNRESOLVED
        ).scalar() or 0

        # Category Breakdown
        categories = db.query(Category).all()
        cat_summaries = []
        for cat in categories:
            prod_count = db.query(func.count(Product.id)).filter(
                Product.category_id == cat.id,
                Product.active == True
            ).scalar() or 0
            total_cat_qty = db.query(func.sum(Inventory.quantity)).join(Product).filter(
                Product.category_id == cat.id,
                Product.active == True
            ).scalar() or 0
            cat_summaries.append(CategoryStockSummary(
                category=cat.name,
                product_count=prod_count,
                total_quantity=total_cat_qty or 0
            ))

        # 7-Day Trend
        daily_trends = []
        for i in range(6, -1, -1):
            day_date = now - timedelta(days=i)
            day_start = datetime(day_date.year, day_date.month, day_date.day, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            date_str = day_start.strftime("%Y-%m-%d")

            # Received / Added
            recv_sum = db.query(func.sum(InventoryTransaction.quantity_change)).filter(
                InventoryTransaction.created_at >= day_start,
                InventoryTransaction.created_at < day_end,
                InventoryTransaction.type.in_([TransactionType.RECEIVE, TransactionType.ADD, TransactionType.RETURN])
            ).scalar() or 0

            # Dispatched / Removed
            disp_sum = db.query(func.sum(InventoryTransaction.quantity_change)).filter(
                InventoryTransaction.created_at >= day_start,
                InventoryTransaction.created_at < day_end,
                InventoryTransaction.type.in_([TransactionType.DISPATCH, TransactionType.REMOVE, TransactionType.DAMAGE])
            ).scalar() or 0
            disp_abs = abs(disp_sum)

            daily_trends.append(DailyStockChange(
                date=date_str,
                received=int(recv_sum),
                dispatched=int(disp_abs),
                net_change=int(recv_sum - disp_abs)
            ))

        # Top active products by RFID scans + transactions
        top_products = []
        for p in active_products[:5]:
            event_count = db.query(func.count(RFIDEvent.id)).filter(RFIDEvent.product_id == p.id).scalar() or 0
            tx_count = db.query(func.count(InventoryTransaction.id)).filter(InventoryTransaction.product_id == p.id).scalar() or 0
            inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
            top_products.append(TopActiveProduct(
                product_id=p.product_id,
                name=p.name,
                total_events=event_count + tx_count,
                current_stock=inv.quantity if inv else 0
            ))
        top_products.sort(key=lambda x: x.total_events, reverse=True)

        # Demand Forecasting
        forecasts = AnalyticsService.calculate_demand_forecast(db)

        return AnalyticsSummaryResponse(
            total_products=total_products,
            total_quantity=total_quantity,
            low_stock_count=low_stock_count,
            critical_stock_count=critical_stock_count,
            active_rfid_tags=active_tags,
            today_transactions_count=today_tx,
            today_rfid_scans_count=today_scans,
            unresolved_alerts_count=unresolved_alerts,
            category_breakdown=cat_summaries,
            daily_trends=daily_trends,
            active_products=top_products,
            demand_forecasts=forecasts
        )

    @staticmethod
    def calculate_demand_forecast(db: Session) -> List[DemandForecastItem]:
        products = db.query(Product).filter(Product.active == True).all()
        forecast_results = []

        for p in products:
            inv = db.query(Inventory).filter(Inventory.product_id == p.id).first()
            current_stock = inv.quantity if inv else 0

            # Get dispatch/usage transactions
            usage_txs = db.query(InventoryTransaction).filter(
                InventoryTransaction.product_id == p.id,
                InventoryTransaction.type.in_([TransactionType.DISPATCH, TransactionType.REMOVE, TransactionType.DAMAGE])
            ).order_by(InventoryTransaction.created_at.asc()).all()

            if not usage_txs:
                forecast_results.append(DemandForecastItem(
                    product_id=p.product_id,
                    name=p.name,
                    current_stock=current_stock,
                    avg_daily_usage=0.0,
                    estimated_stockout_days=None,
                    recommended_reorder=p.minimum_stock * 2,
                    has_sufficient_data=False,
                    status_message="Not enough historical data for reliable forecasting."
                ))
                continue

            # Check number of distinct days
            distinct_days = set(tx.created_at.date() for tx in usage_txs)
            total_units_used = sum(abs(tx.quantity_change) for tx in usage_txs)

            if len(distinct_days) >= 3:
                # Calculate span
                span_days = max((max(distinct_days) - min(distinct_days)).days + 1, len(distinct_days))
                avg_daily = round(total_units_used / span_days, 2)
                if avg_daily > 0:
                    stockout_days = round(current_stock / avg_daily, 1)
                    reorder_qty = int(round(avg_daily * 14)) # 14-day reorder cycle
                else:
                    stockout_days = None
                    reorder_qty = p.minimum_stock

                forecast_results.append(DemandForecastItem(
                    product_id=p.product_id,
                    name=p.name,
                    current_stock=current_stock,
                    avg_daily_usage=avg_daily,
                    estimated_stockout_days=stockout_days,
                    recommended_reorder=max(reorder_qty, p.minimum_stock),
                    has_sufficient_data=True,
                    status_message=f"Forecast based on {len(usage_txs)} historical dispatches across {len(distinct_days)} days."
                ))
            else:
                forecast_results.append(DemandForecastItem(
                    product_id=p.product_id,
                    name=p.name,
                    current_stock=current_stock,
                    avg_daily_usage=0.0,
                    estimated_stockout_days=None,
                    recommended_reorder=p.minimum_stock * 2,
                    has_sufficient_data=False,
                    status_message="Not enough historical data for reliable forecasting."
                ))

        return forecast_results

analytics_service = AnalyticsService()

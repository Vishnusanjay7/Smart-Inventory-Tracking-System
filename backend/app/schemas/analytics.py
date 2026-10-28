from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class CategoryStockSummary(BaseModel):
    category: str
    product_count: int
    total_quantity: int

class DailyStockChange(BaseModel):
    date: str
    received: int
    dispatched: int
    net_change: int

class TopActiveProduct(BaseModel):
    product_id: str
    name: str
    total_events: int
    current_stock: int

class DemandForecastItem(BaseModel):
    product_id: str
    name: str
    current_stock: int
    avg_daily_usage: float
    estimated_stockout_days: Optional[float] = None
    recommended_reorder: int
    has_sufficient_data: bool
    status_message: str

class AnalyticsSummaryResponse(BaseModel):
    total_products: int
    total_quantity: int
    low_stock_count: int
    critical_stock_count: int
    active_rfid_tags: int
    today_transactions_count: int
    today_rfid_scans_count: int
    unresolved_alerts_count: int
    category_breakdown: List[CategoryStockSummary]
    daily_trends: List[DailyStockChange]
    active_products: List[TopActiveProduct]
    demand_forecasts: List[DemandForecastItem]

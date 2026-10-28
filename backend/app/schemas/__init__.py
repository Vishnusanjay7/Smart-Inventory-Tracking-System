from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, UserCreate, UserUpdate
from app.schemas.category import CategoryCreate, CategoryResponse
from app.schemas.rack import RackCreate, RackResponse
from app.schemas.rfid_tag import RFIDTagCreate, RFIDTagResponse
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductDetailResponse, ProductAssignRfid, ProductReassignRfid
from app.schemas.inventory import InventoryResponse, InventoryOperationRequest
from app.schemas.transaction import TransactionResponse, TransactionFilter
from app.schemas.rfid_event import RFIDEventCreate, RFIDEventResponse
from app.schemas.device import DeviceResponse, ReaderResponse, HeartbeatRequest, HeartbeatResponse
from app.schemas.alert import AlertResponse, AlertResolveRequest
from app.schemas.analytics import AnalyticsSummaryResponse, DemandForecastItem, CategoryStockSummary, DailyStockChange, TopActiveProduct
from app.schemas.simulator import SimulatorScanRequest

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    "UserCreate",
    "UserUpdate",
    "CategoryCreate",
    "CategoryResponse",
    "RackCreate",
    "RackResponse",
    "RFIDTagCreate",
    "RFIDTagResponse",
    "ProductCreate",
    "ProductUpdate",
    "ProductResponse",
    "ProductDetailResponse",
    "ProductAssignRfid",
    "ProductReassignRfid",
    "InventoryResponse",
    "InventoryOperationRequest",
    "TransactionResponse",
    "TransactionFilter",
    "RFIDEventCreate",
    "RFIDEventResponse",
    "DeviceResponse",
    "ReaderResponse",
    "HeartbeatRequest",
    "HeartbeatResponse",
    "AlertResponse",
    "AlertResolveRequest",
    "AnalyticsSummaryResponse",
    "DemandForecastItem",
    "CategoryStockSummary",
    "DailyStockChange",
    "TopActiveProduct",
    "SimulatorScanRequest",
]

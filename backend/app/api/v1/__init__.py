from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.products import router as products_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.rfid import router as rfid_router
from app.api.v1.iot import router as iot_router
from app.api.v1.devices import router as devices_router
from app.api.v1.racks import router as racks_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.reports import router as reports_router
from app.api.v1.users import router as users_router
from app.api.v1.simulator import router as simulator_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(categories_router, prefix="/categories", tags=["Categories"])
api_router.include_router(products_router, prefix="/products", tags=["Products"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(transactions_router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(rfid_router, prefix="/rfid", tags=["RFID"])
api_router.include_router(iot_router, prefix="/iot", tags=["IoT Hardware"])
api_router.include_router(devices_router, prefix="/devices", tags=["IoT Devices"])
api_router.include_router(racks_router, prefix="/racks", tags=["Racks"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports"])
api_router.include_router(users_router, prefix="/users", tags=["Users & RBAC"])
api_router.include_router(simulator_router, prefix="/simulator", tags=["Development Simulator"])

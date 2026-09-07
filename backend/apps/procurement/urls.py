from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MaterialRequestViewSet, MaterialRequestItemViewSet,
    PurchaseOrderViewSet, PurchaseOrderItemViewSet,
    GoodsReceiptViewSet, GoodsReceiptItemViewSet,
    PurchaseRequestViewSet,
)

router = DefaultRouter()
router.register(r'material-requests', MaterialRequestViewSet)
router.register(r'material-request-items', MaterialRequestItemViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'po-items', PurchaseOrderItemViewSet)
router.register(r'goods-receipts', GoodsReceiptViewSet)
router.register(r'goods-receipt-items', GoodsReceiptItemViewSet)
# Backward compatibility
router.register(r'purchase-requests', PurchaseRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

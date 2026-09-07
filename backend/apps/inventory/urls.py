from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaterialViewSet, StockTransactionViewSet, ProjectMaterialStockViewSet

router = DefaultRouter()
router.register(r'materials', MaterialViewSet)
router.register(r'stock-transactions', StockTransactionViewSet)
router.register(r'project-stock', ProjectMaterialStockViewSet, basename='project-stock')

urlpatterns = [
    path('', include(router.urls)),
]

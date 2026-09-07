from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContractorViewSet, WorkOrderViewSet

router = DefaultRouter()
router.register(r'contractors', ContractorViewSet)
router.register(r'work-orders', WorkOrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

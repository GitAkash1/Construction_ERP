from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubcontractorViewSet, 
    SubcontractWorkOrderViewSet, 
    WorkProgressViewSet, 
    SubcontractorBillViewSet
)

router = DefaultRouter()
router.register(r'subcontractors', SubcontractorViewSet)
router.register(r'work-orders', SubcontractWorkOrderViewSet)
router.register(r'work-progress', WorkProgressViewSet)
router.register(r'bills', SubcontractorBillViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

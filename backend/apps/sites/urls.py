from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SiteViewSet, DailyProgressViewSet, SiteConsumptionViewSet, SiteConsumptionItemViewSet

router = DefaultRouter()
router.register(r'sites', SiteViewSet)
router.register(r'site-progress', DailyProgressViewSet)
router.register(r'consumptions', SiteConsumptionViewSet)
router.register(r'consumption-items', SiteConsumptionItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

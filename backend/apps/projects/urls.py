from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, BOQViewSet, BOQItemViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'boqs', BOQViewSet)
router.register(r'boq-items', BOQItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

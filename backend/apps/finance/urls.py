from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'finance', ProjectCostViewSet)

urlpatterns = [
    path('project-cost/<int:project_id>/', ProjectCostSummaryAPIView.as_view(), name='project-cost-summary'),
    path('project-cost/<int:project_id>/transactions/', ProjectCostTransactionsAPIView.as_view(), name='project-cost-transactions'),
    path('', include(router.urls)),
]


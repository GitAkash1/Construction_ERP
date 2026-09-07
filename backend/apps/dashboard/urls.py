from django.urls import path
from .views import (
    DashboardStatsView,
    ProjectMaterialSummaryView,
    BOQConsumptionReportView,
    POStatusReportView,
    SiteStockReportView,
    ProjectCostSummaryView,
)

urlpatterns = [
    path('', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('reports/material-summary/', ProjectMaterialSummaryView.as_view(), name='material-summary'),
    path('reports/boq-consumption/', BOQConsumptionReportView.as_view(), name='boq-consumption'),
    path('reports/po-status/', POStatusReportView.as_view(), name='po-status'),
    path('reports/site-stock/', SiteStockReportView.as_view(), name='site-stock'),
    path('reports/project-cost/', ProjectCostSummaryView.as_view(), name='project-cost'),
]

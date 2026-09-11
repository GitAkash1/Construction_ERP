"""
URL configuration for constructionErp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
"""
# pyrefly: ignore [missing-import]
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/projects/', include('apps.projects.urls')),
    path('api/engineering/', include('apps.engineering.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/sites/', include('apps.sites.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/procurement/', include('apps.procurement.urls')),
    path('api/contractors/', include('apps.contractors.urls')),
    path('api/finance/', include('apps.finance.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/subcontractors/', include('apps.subcontractors.urls')),
    path('api/work-center/', include('apps.workcenter.urls')),
]

import os

apps = {
    'projects': {'model': 'Project', 'filter': "['status']", 'search': "['project_code', 'project_name']"},
    'engineering': {'model': 'Milestone', 'filter': "['status', 'project']", 'search': "['milestone_name']"},
    'tasks': {'model': 'Task', 'filter': "['status', 'priority', 'project', 'milestone', 'assigned_to']", 'search': "['task_title']"},
    'sites': {'model': 'Site', 'filter': "['status', 'project']", 'search': "['site_name', 'site_location']"},
    'inventory': {'model': 'Material', 'filter': "['category']", 'search': "['material_code', 'material_name']"},
    'procurement': {'model': 'PurchaseOrder', 'filter': "['status', 'project']", 'search': "['po_number', 'vendor']"},
    'contractors': {'model': 'Contractor', 'filter': "['status']", 'search': "['contractor_code', 'company_name']"},
    'finance': {'model': 'ProjectCost', 'filter': "['cost_category', 'project']", 'search': "['description', 'reference']"},
}

for app, meta in apps.items():
    model = meta['model']
    filterset = meta['filter']
    search = meta['search']
    
    # serializers.py
    with open(f"apps/{app}/serializers.py", "w") as f:
        f.write(f"""from rest_framework import serializers
from .models import *

class {model}Serializer(serializers.ModelSerializer):
    class Meta:
        model = {model}
        fields = '__all__'
""")
    
    # views.py
    with open(f"apps/{app}/views.py", "w") as f:
        f.write(f"""from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import *
from .serializers import *

class {model}ViewSet(viewsets.ModelViewSet):
    queryset = {model}.objects.all().order_by('-id')
    serializer_class = {model}Serializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {filterset}
    search_fields = {search}
""")

    # urls.py
    with open(f"apps/{app}/urls.py", "w") as f:
        f.write(f"""from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'{app}', {model}ViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
""")

print("API scaffolding complete.")

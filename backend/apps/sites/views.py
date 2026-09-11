from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Site, DailyProgress, SiteConsumption, SiteConsumptionItem
from .serializers import (
    SiteSerializer, DailyProgressSerializer,
    SiteConsumptionSerializer, SiteConsumptionItemSerializer,
)
from apps.procurement.services import consume_materials


class SiteViewSet(viewsets.ModelViewSet):
    rbac_module = 'sites'
    queryset = Site.objects.all().order_by('-id')
    serializer_class = SiteSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project']
    search_fields = ['site_name', 'site_location']


class DailyProgressViewSet(viewsets.ModelViewSet):
    rbac_module = 'site_progress'
    queryset = DailyProgress.objects.all().order_by('-date')
    serializer_class = DailyProgressSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['site']
    search_fields = ['work_description', 'remarks']


class SiteConsumptionViewSet(viewsets.ModelViewSet):
    rbac_module = 'site_consumption'
    queryset = SiteConsumption.objects.select_related('project', 'site').prefetch_related('items__material').order_by('-consumption_date')
    serializer_class = SiteConsumptionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'site']
    search_fields = ['activity', 'remarks']

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        project_id = request.query_params.get('project')
        
        if project_id:
            data = response.data.get('results', response.data) if isinstance(response.data, dict) and 'results' in response.data else response.data
            
            from apps.inventory.models import ProjectMaterialStock
            stocks = ProjectMaterialStock.objects.filter(project_id=project_id).select_related('boq_item__material')
            issued_map = {}
            for stock in stocks:
                mat_id = stock.boq_item.material_id if stock.boq_item and stock.boq_item.material else None
                if mat_id:
                    issued_map[mat_id] = issued_map.get(mat_id, 0) + stock.issued_qty

            all_consumptions = SiteConsumption.objects.filter(project_id=project_id).order_by('consumption_date', 'id').prefetch_related('items')
            
            running_usage = {}
            item_balances = {}
            
            for cons in all_consumptions:
                for item in cons.items.all():
                    mat_id = item.material_id
                    if mat_id not in running_usage:
                        running_usage[mat_id] = 0
                    
                    running_usage[mat_id] += item.quantity
                    issued = issued_map.get(mat_id, 0)
                    balance = issued - running_usage[mat_id]
                    
                    item_balances[item.id] = {
                        'issued_qty': issued,
                        'balance_qty': balance
                    }
            
            new_data = []
            for cons_data in data:
                cons_dict = dict(cons_data)
                new_items = []
                for item_data in cons_dict.get('items', []):
                    item_dict = dict(item_data)
                    item_id = item_dict.get('id')
                    if item_id in item_balances:
                        item_dict['issued_qty'] = item_balances[item_id]['issued_qty']
                        item_dict['balance_qty'] = item_balances[item_id]['balance_qty']
                    else:
                        issued = issued_map.get(item_dict.get('material'), 0)
                        item_dict['issued_qty'] = issued
                        item_dict['balance_qty'] = issued - float(item_dict.get('quantity', 0))
                    new_items.append(item_dict)
                cons_dict['items'] = new_items
                new_data.append(cons_dict)
            
            if isinstance(response.data, dict) and 'results' in response.data:
                response.data['results'] = new_data
            else:
                response.data = new_data
                
        return response

    @action(detail=False, methods=['get'], url_path='eligible-projects')
    def eligible_projects(self, request):
        from apps.projects.models import Project
        
        # A project is eligible if it has an Approved or Converted material request
        # and there is actual project stock available (ProjectMaterialStock)
        projects = Project.objects.filter(
            material_requests__status__in=['Approved', 'Converted'],
            project_stocks__issued_qty__gt=0
        ).values('id', 'project_name', 'project_location').distinct()
        
        data = [
            {
                'project_id': p['id'],
                'project_name': p['project_name'],
                'location': p['project_location']
            }
            for p in projects
        ]
        return Response(data)

    @action(detail=False, methods=['get'], url_path='project-summary')
    def project_summary(self, request):
        from django.db.models import Max
        
        # Group by project to get a unique list of projects with their latest consumption date
        summary = SiteConsumption.objects.values(
            'project', 
            'project__project_name', 
            'project__project_location'
        ).annotate(
            latest_date=Max('consumption_date')
        ).order_by('-latest_date')
        
        data = [
            {
                'project_id': item['project'],
                'project_name': item['project__project_name'],
                'location': item['project__project_location'] or 'N/A',
                'consumption_date': item['latest_date']
            }
            for item in summary
        ]
        return Response(data)

    def create(self, request, *args, **kwargs):
        """
        Expects:
        {
            "project": <id>,
            "site": <id>,
            "consumption_date": "YYYY-MM-DD",
            "activity": "...",
            "remarks": "...",
            "items": [
                {
                    "material_id": <id>,
                    "boq_item_id": <id or null>,
                    "quantity": <qty>,
                    "unit": "...",
                    "unit_price": <price>
                }, ...
            ]
        }
        """
        items_data = request.data.get('items', [])
        if not items_data:
            return Response({'error': 'At least one consumption item is required.'}, status=400)

        # Ensure request.data is mutable
        if hasattr(request.data, '_mutable'):
            request.data._mutable = True
            
        project_id = request.data.get('project')
        
        # Verify eligibility and resolve site
        if project_id:
            from apps.projects.models import Project
            from apps.sites.models import Site
            
            is_eligible = Project.objects.filter(
                id=project_id,
                material_requests__status__in=['Approved', 'Converted'],
                project_stocks__issued_qty__gt=0
            ).exists()
            if not is_eligible:
                return Response({'error': 'Selected project is not eligible for consumption. It must have an approved material request with available stock.'}, status=400)
                
            # If site is missing, pick the first site associated with the project to satisfy model requirements
            if not request.data.get('site'):
                site = Site.objects.filter(project_id=project_id).first()
                if site:
                    request.data['site'] = site.id
                else:
                    project_instance = Project.objects.get(id=project_id)
                    site = Site.objects.create(
                        project=project_instance,
                        site_name=f"{project_instance.project_name} - Main Site",
                        site_location=project_instance.project_location or 'Default Location',
                        start_date=project_instance.start_date,
                        status='Active'
                    )
                    request.data['site'] = site.id
                    
        if hasattr(request.data, '_mutable'):
            request.data._mutable = False

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                consumption = serializer.save(consumed_by=request.user)
                consume_materials(consumption, items_data, created_by=request.user)
        except (ValidationError, Exception) as e:
            return Response({'error': str(e)}, status=400)

        return Response(SiteConsumptionSerializer(consumption).data, status=201)


class SiteConsumptionItemViewSet(viewsets.ModelViewSet):
    rbac_module = 'site_consumption'
    queryset = SiteConsumptionItem.objects.all().order_by('-id')
    serializer_class = SiteConsumptionItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['consumption', 'material', 'boq_item']

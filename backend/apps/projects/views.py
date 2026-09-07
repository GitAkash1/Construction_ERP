from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Project, BOQ, BOQItem
from .serializers import ProjectSerializer, BOQSerializer, BOQItemSerializer
from .filters import ProjectFilter
from .pagination import ProjectPagination, BOQPagination


class ProjectViewSet(viewsets.ModelViewSet):
    rbac_module = 'projects'
    queryset = Project.objects.all().order_by('-id')
    serializer_class = ProjectSerializer
    pagination_class = ProjectPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProjectFilter
    search_fields = ['project_code', 'project_name', 'client_name']

    def get_permissions(self):
        if self.action in ['all', 'filters_data']:
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return super().get_permissions()


    @action(detail=False, methods=['get'])
    def filters_data(self, request):
        """Returns unique project names and locations for the frontend filters."""
        project_names = Project.objects.values_list('project_name', flat=True).distinct()
        locations = Project.objects.exclude(project_location__isnull=True).exclude(project_location='').values_list('project_location', flat=True).distinct()
        
        return Response({
            'project_names': list(project_names),
            'locations': list(locations)
        })

    @action(detail=False, methods=['get'])
    def all(self, request):
        """Returns all projects without pagination for dropdowns."""
        projects = Project.objects.all().values('id', 'project_name', 'project_location')
        return Response(list(projects))


class BOQViewSet(viewsets.ModelViewSet):
    rbac_module = 'boq'
    queryset = BOQ.objects.select_related('project').prefetch_related('items__material').order_by('-id')
    serializer_class = BOQSerializer
    pagination_class = BOQPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'bill_date']
    search_fields = ['boq_number', 'project__project_name']

    def get_queryset(self):
        qs = super().get_queryset()
        project_name = self.request.query_params.get('project_name')
        if project_name:
            qs = qs.filter(project__project_name__icontains=project_name)
        bill_date = self.request.query_params.get('bill_date')
        if bill_date:
            qs = qs.filter(bill_date=bill_date)
        return qs


class BOQItemViewSet(viewsets.ModelViewSet):
    rbac_module = 'boq'
    queryset = BOQItem.objects.select_related('material', 'boq').order_by('id')
    serializer_class = BOQItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['boq', 'material', 'boq__project']
    search_fields = ['material__material_name']

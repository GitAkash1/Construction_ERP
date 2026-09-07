from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Contractor, WorkOrder
from .serializers import ContractorSerializer, WorkOrderSerializer

class ContractorViewSet(viewsets.ModelViewSet):
    queryset = Contractor.objects.all().order_by('-id')
    serializer_class = ContractorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['contractor_code', 'company_name', 'contractor_name']

class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all().order_by('-start_date')
    serializer_class = WorkOrderSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'contractor', 'project']
    search_fields = ['work_description']

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from decimal import Decimal
from django.db.models import OuterRef, Subquery, Sum, DecimalField, Value
from django.db.models.functions import Coalesce
from .models import Material, StockTransaction, ProjectMaterialStock
from .serializers import MaterialSerializer, StockTransactionSerializer, ProjectMaterialStockSerializer
from apps.projects.models import BOQ
from apps.subcontractors.models import SubcontractWorkOrder

wo_alloc_subquery = SubcontractWorkOrder.objects.filter(
    boq_item=OuterRef('boq_item')
).exclude(status='Cancelled').values('boq_item').annotate(
    total=Sum('contract_quantity')
).values('total')

class MaterialViewSet(viewsets.ModelViewSet):
    rbac_module = 'materials'
    queryset = Material.objects.all().order_by('-id')
    serializer_class = MaterialSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['material_code', 'material_name']

class StockTransactionViewSet(viewsets.ModelViewSet):
    rbac_module = 'stock'
    queryset = StockTransaction.objects.all().order_by('-transaction_date')
    serializer_class = StockTransactionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['material', 'site', 'transaction_type']
    search_fields = ['reference', 'remarks']


class ProjectMaterialStockViewSet(viewsets.ReadOnlyModelViewSet):
    rbac_module = 'stock'
    queryset = ProjectMaterialStock.objects.select_related(
        'project', 'boq_item__material', 'boq_item__boq'
    ).annotate(
        annotated_allocated_wo_qty=Coalesce(
            Subquery(wo_alloc_subquery, output_field=DecimalField(max_digits=12, decimal_places=2)),
            Value(Decimal('0.00')),
            output_field=DecimalField(max_digits=12, decimal_places=2)
        )
    ).order_by('-id')
    serializer_class = ProjectMaterialStockSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'boq_item']
    search_fields = ['boq_item__material__material_name', 'boq_item__custom_material_name']

    def get_queryset(self):
        qs = super().get_queryset()
        boq_id = self.request.query_params.get('boq')
        if boq_id:
            qs = qs.filter(boq_item__boq_id=boq_id)
        return qs

    @action(detail=False, methods=['get'])
    def boq_summary(self, request):
        project_id = request.query_params.get('project')
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        # Base query for BOQs that have associated project material stocks
        boq_qs = BOQ.objects.filter(items__project_stock__isnull=False).distinct().order_by('-id')
        
        if project_id:
            boq_qs = boq_qs.filter(project_id=project_id)
        if from_date:
            boq_qs = boq_qs.filter(bill_date__gte=from_date)
        if to_date:
            boq_qs = boq_qs.filter(bill_date__lte=to_date)
            
        summary_rows = boq_qs.values('id', 'boq_number', 'project__project_name', 'bill_date')
        data = [
            {
                'boq_id': row['id'],
                'boq_number': row['boq_number'],
                'project_name': row['project__project_name'],
                'bill_date': str(row['bill_date']) if row['bill_date'] else None
            }
            for row in summary_rows
        ]
        return Response(data)


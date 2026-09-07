from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Sum, F
from decimal import Decimal
from django.utils import timezone

from .models import Subcontractor, SubcontractWorkOrder, WorkProgress, SubcontractorBill
from .serializers import (
    SubcontractorSerializer, 
    SubcontractWorkOrderSerializer, 
    WorkProgressSerializer, 
    SubcontractorBillSerializer
)
from apps.finance.models import ProjectCost


class SubcontractorViewSet(viewsets.ModelViewSet):
    rbac_module = 'subcontractors'
    queryset = Subcontractor.objects.all().order_by('-id')
    serializer_class = SubcontractorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['subcontractor_name', 'work_category', 'contact_person']

    @action(detail=False, methods=['get'])
    def all(self, request):
        qs = self.get_queryset().filter(status='Active')
        return Response(qs.values('id', 'subcontractor_name'))


class SubcontractWorkOrderViewSet(viewsets.ModelViewSet):
    rbac_module = 'work_orders'
    rbac_action_map = {
        'issue': 'work_orders.edit',
        'cancel': 'work_orders.edit'
    }
    queryset = SubcontractWorkOrder.objects.select_related('project', 'boq_item', 'subcontractor').order_by('-id')
    serializer_class = SubcontractWorkOrderSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project', 'subcontractor']
    search_fields = ['work_order_number', 'work_description']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        wo = self.get_object()
        if wo.status != 'Draft':
            return Response({'error': 'Only Draft work orders can be issued.'}, status=status.HTTP_400_BAD_REQUEST)
        wo.status = 'Issued'
        wo.save()
        return Response({'status': 'Work order issued.'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        wo = self.get_object()
        if wo.status in ['Completed', 'Cancelled']:
            return Response({'error': f'Cannot cancel work order in {wo.status} status.'}, status=status.HTTP_400_BAD_REQUEST)
        wo.status = 'Cancelled'
        wo.save()
        return Response({'status': 'Work order cancelled.'})


class WorkProgressViewSet(viewsets.ModelViewSet):
    rbac_module = 'measurements'
    rbac_action_map = {
        'approve': 'measurements.approve',
        'reject': 'measurements.approve'
    }
    queryset = WorkProgress.objects.select_related('work_order__project', 'work_order__subcontractor', 'work_order__boq_item__material', 'submitted_by', 'approved_by').order_by('-id')
    serializer_class = WorkProgressSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'work_order', 'work_order__project']
    
    def perform_create(self, serializer):
        wo = serializer.validated_data['work_order']
        if wo.status == 'Issued':
            wo.status = 'In Progress'
            wo.save()
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request, pk=None):
        progress = self.get_object()
        if progress.status != 'Pending':
            return Response({'error': 'Only pending measurements can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
            
        approved_qty = request.data.get('approved_quantity')
        if not approved_qty:
            return Response({'error': 'approved_quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            approved_qty = Decimal(str(approved_qty))
        except:
            return Response({'error': 'Invalid approved_quantity.'}, status=status.HTTP_400_BAD_REQUEST)

        if approved_qty < 0:
            return Response({'error': 'Approved quantity cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate against submitted quantity
        if approved_qty > progress.submitted_quantity:
            return Response({'error': f'Approved quantity cannot exceed the submitted quantity ({progress.submitted_quantity}).'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate against remaining contract quantity
        wo = progress.work_order
        previously_approved = wo.progress_records.filter(status='Approved').aggregate(total=Sum('approved_quantity'))['total'] or Decimal('0.00')
        remaining_contract_qty = wo.contract_quantity - previously_approved
        
        if approved_qty > remaining_contract_qty:
            return Response({'error': f'Approved quantity cannot exceed the remaining contract quantity ({remaining_contract_qty}).'}, status=status.HTTP_400_BAD_REQUEST)

        progress.status = 'Approved'
        progress.approved_quantity = approved_qty
        progress.approved_by = request.user
        progress.approved_at = timezone.now()
        progress.save()
        
        # Update BOQ Item consumed quantity
        if wo.boq_item:
            wo.boq_item.consumed_quantity = F('consumed_quantity') + approved_qty
            wo.boq_item.save(update_fields=['consumed_quantity'])
            # Refresh from DB to avoid cached values in save logic if any
            wo.boq_item.refresh_from_db()
        
        # Check if work order is completed
        total_approved = previously_approved + approved_qty
        if total_approved >= wo.contract_quantity:
            wo.status = 'Completed'
            wo.save()
            
        return Response({'status': 'Measurement approved.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        progress = self.get_object()
        if progress.status != 'Pending':
            return Response({'error': 'Only pending measurements can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
            
        progress.status = 'Rejected'
        progress.rejection_reason = request.data.get('rejection_reason', '')
        progress.approved_quantity = Decimal('0.00')
        progress.save()
        return Response({'status': 'Measurement rejected.'})


class SubcontractorBillViewSet(viewsets.ModelViewSet):
    rbac_module = 'subcontractor_bills'
    rbac_action_map = {
        'submit': 'subcontractor_bills.edit',
        'approve': 'subcontractor_bills.approve'
    }
    queryset = SubcontractorBill.objects.select_related('project', 'work_order', 'subcontractor', 'created_by').order_by('-id')
    serializer_class = SubcontractorBillSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project', 'subcontractor', 'work_order']
    search_fields = ['bill_number']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        bill = self.get_object()
        if bill.status != 'Draft':
            return Response({'error': 'Only Draft bills can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        bill.status = 'Submitted'
        bill.save()
        return Response({'status': 'Bill submitted.'})

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request, pk=None):
        bill = self.get_object()
        if bill.status not in ['Draft', 'Submitted']:
            return Response({'error': 'Only Draft or Submitted bills can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Finance integration: Create ProjectCost
        cost_desc = f"Subcontractor Bill {bill.bill_number} - {bill.subcontractor.subcontractor_name}"
        project_cost = ProjectCost.objects.create(
            project=bill.project,
            cost_category='Contractor',
            description=cost_desc,
            amount=bill.total_amount,
            date=timezone.now().date(),
            reference=bill.bill_number,
            created_by=request.user
        )
        
        bill.status = 'Approved'
        bill.project_cost = project_cost
        bill.save()
        
        return Response({'status': 'Bill approved and project cost integrated.'})

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from .models import (
    MaterialRequest, MaterialRequestItem,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem,
    PurchaseRequest,
)
from .serializers import (
    MaterialRequestSerializer, MaterialRequestItemSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    GoodsReceiptSerializer, GoodsReceiptItemSerializer,
    PurchaseRequestSerializer,
)
from .services import receive_goods


class MaterialRequestViewSet(viewsets.ModelViewSet):
    rbac_module = 'material_requests'
    rbac_action_map = {
        'approve': 'material_requests.approve',
        'reject': 'material_requests.approve',
        'undo': 'material_requests.approve',
        'destroy': 'material_requests.create'
    }
    queryset = MaterialRequest.objects.select_related('project', 'site', 'boq').prefetch_related('items__material').order_by('-created_at')
    serializer_class = MaterialRequestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project', 'site', 'boq', 'request_date']
    search_fields = ['request_number', 'remarks']

    def get_queryset(self):
        qs = super().get_queryset()
        date_param = self.request.query_params.get('date') or self.request.query_params.get('request_date')
        if date_param:
            qs = qs.filter(request_date=date_param)
        return qs

    @action(detail=False, methods=['get'], url_path='next-request-number')
    def next_request_number(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'Project ID is required.'}, status=400)
        
        with transaction.atomic():
            requests = MaterialRequest.objects.filter(project_id=project_id).select_for_update()
            max_num = 0
            for req in requests:
                try:
                    num = int(req.request_number.split('-')[-1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    pass
            next_num = max_num + 1
            next_req_num = f"MR-{next_num:03d}"
            return Response({'next_request_number': next_req_num})

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        with transaction.atomic():
            requests = MaterialRequest.objects.filter(project=project).select_for_update()
            max_num = 0
            for req in requests:
                try:
                    num = int(req.request_number.split('-')[-1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    pass
            next_num = max_num + 1
            next_req_num = f"MR-{next_num:03d}"
            
            # Using self.request.user if authenticated, otherwise keep it simple
            user = self.request.user if self.request.user.is_authenticated else None
            serializer.save(request_number=next_req_num, requested_by=user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        from django.utils import timezone
        from apps.inventory.models import ProjectMaterialStock
        from django.db.models import Sum

        mr = self.get_object()
        if mr.status not in ('Draft', 'Pending'):
            return Response({'error': 'Only Draft or Pending requests can be approved.'}, status=400)
            
        with transaction.atomic():
            # Validate BOQ balances first
            for item in mr.items.all():
                if item.boq_item:
                    # Lock BOQItem row to prevent race conditions
                    from apps.projects.models import BOQItem
                    boq_item = BOQItem.objects.select_for_update().get(id=item.boq_item.id)
                    
                    # Calculate total already approved for this BOQ item
                    # Exclude the current request if we ever support re-approving (though we guard above)
                    already_approved = MaterialRequestItem.objects.filter(
                        boq_item=boq_item,
                        material_request__status='Approved'
                    ).aggregate(Sum('approved_quantity'))['approved_quantity__sum'] or 0
                    
                    available_balance = boq_item.quantity - already_approved
                    
                    if item.requested_quantity > available_balance:
                        raise DRFValidationError(
                            f"Approval failed for {item.material.material_name}. "
                            f"Requested: {item.requested_quantity}, Available BOQ Balance: {available_balance}."
                        )

            # Proceed with approval
            for item in mr.items.all():
                item.approved_quantity = item.requested_quantity
                item.save(update_fields=['approved_quantity'])

            mr.status = 'Approved'
            mr.approved_by = request.user if request.user.is_authenticated else None
            mr.action_date = timezone.now().date()
            mr.save(update_fields=['status', 'approved_by', 'action_date'])
            
        return Response(MaterialRequestSerializer(mr).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        from django.utils import timezone
        mr = self.get_object()
        if mr.status not in ('Draft', 'Pending'):
            return Response({'error': 'Only Draft or Pending requests can be rejected.'}, status=400)
        
        mr.status = 'Rejected'
        mr.approved_by = request.user if request.user.is_authenticated else None
        mr.action_date = timezone.now().date()
        mr.save(update_fields=['status', 'approved_by', 'action_date'])
        return Response(MaterialRequestSerializer(mr).data)

    @action(detail=True, methods=['post'])
    def undo(self, request, pk=None):
        mr = self.get_object()
        
        if mr.status == 'Approved':
            return Response({'error': 'Approved requests cannot be undone.'}, status=400)
        
        if mr.status != 'Rejected':
            return Response({'error': 'Only Rejected requests can be undone.'}, status=400)
            
        with transaction.atomic():
            mr.status = 'Draft'
            mr.approved_by = None
            mr.action_date = None
            mr.save(update_fields=['status', 'approved_by', 'action_date'])
            
        return Response(MaterialRequestSerializer(mr).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'Draft':
            return Response({'error': 'Only Draft material requests can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class MaterialRequestItemViewSet(viewsets.ModelViewSet):
    rbac_module = 'material_requests'
    queryset = MaterialRequestItem.objects.all().order_by('id')
    serializer_class = MaterialRequestItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['material_request', 'material', 'boq_item']

    def validate_boq_balance(self, boq_item, qty, instance=None):
        """Check requested qty does not exceed BOQ balance."""
        if boq_item:
            # Existing requested qty for this BOQ item (excluding current instance)
            existing = sum(
                i.requested_quantity for i in boq_item.request_items.all()
                if instance is None or i.pk != instance.pk
            )
            balance = boq_item.balance_quantity - existing
            if qty > balance:
                raise DRFValidationError(
                    f"Requested quantity ({qty}) exceeds the available BOQ balance ({balance})."
                )

    def perform_create(self, serializer):
        boq_item = serializer.validated_data.get('boq_item')
        mr = serializer.validated_data.get('material_request')
        qty = serializer.validated_data.get('requested_quantity')
        unit = serializer.validated_data.get('unit')
        
        if boq_item:
            if not boq_item.material:
                if boq_item.custom_material_name:
                    from apps.inventory.models import Material
                    matched = Material.objects.filter(
                        material_name__iexact=boq_item.custom_material_name.strip()
                    ).first()
                    if matched:
                        boq_item.material = matched
                        boq_item.save(update_fields=['material'])
                    else:
                        from django.utils.crypto import get_random_string
                        new_code = f"MAT-{get_random_string(6).upper()}"
                        new_mat = Material.objects.create(
                            material_code=new_code,
                            material_name=boq_item.custom_material_name.strip(),
                            unit=boq_item.unit,
                            category="Auto-Generated"
                        )
                        boq_item.material = new_mat
                        boq_item.save(update_fields=['material'])
                else:
                    raise DRFValidationError({"material": "Selected BOQ item is not linked to a material. Please update the BOQ item before creating a material request."})
            if mr and boq_item.boq.project != mr.project:
                raise DRFValidationError("The selected BOQ item does not belong to this request's project.")
            if mr and mr.boq and boq_item.boq != mr.boq:
                raise DRFValidationError("The selected BOQ item does not belong to this request's BOQ.")

            if unit and unit != boq_item.unit:
                raise DRFValidationError(f"Submitted unit '{unit}' does not match BOQ item unit '{boq_item.unit}'.")
            
            self.validate_boq_balance(boq_item, qty)
            serializer.save(material=boq_item.material, unit=boq_item.unit)
        else:
            raise DRFValidationError("BOQ Item is required.")

    def perform_update(self, serializer):
        boq_item = serializer.validated_data.get('boq_item')
        mr = serializer.validated_data.get('material_request', serializer.instance.material_request)
        qty = serializer.validated_data.get('requested_quantity')
        unit = serializer.validated_data.get('unit')
        
        if boq_item:
            if not boq_item.material:
                if boq_item.custom_material_name:
                    from apps.inventory.models import Material
                    matched = Material.objects.filter(
                        material_name__iexact=boq_item.custom_material_name.strip()
                    ).first()
                    if matched:
                        boq_item.material = matched
                        boq_item.save(update_fields=['material'])
                    else:
                        from django.utils.crypto import get_random_string
                        new_code = f"MAT-{get_random_string(6).upper()}"
                        new_mat = Material.objects.create(
                            material_code=new_code,
                            material_name=boq_item.custom_material_name.strip(),
                            unit=boq_item.unit,
                            category="Auto-Generated"
                        )
                        boq_item.material = new_mat
                        boq_item.save(update_fields=['material'])
                else:
                    raise DRFValidationError({"material": "Selected BOQ item is not linked to a material. Please update the BOQ item before creating a material request."})
            if mr and boq_item.boq.project != mr.project:
                raise DRFValidationError("The selected BOQ item does not belong to this request's project.")
            if mr and mr.boq and boq_item.boq != mr.boq:
                raise DRFValidationError("The selected BOQ item does not belong to this request's BOQ.")

            if unit and unit != boq_item.unit:
                raise DRFValidationError(f"Submitted unit '{unit}' does not match BOQ item unit '{boq_item.unit}'.")
            
            self.validate_boq_balance(boq_item, qty, instance=self.get_object())
            serializer.save(material=boq_item.material, unit=boq_item.unit)
        else:
            raise DRFValidationError("BOQ Item is required.")


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    rbac_module = 'purchase_orders'
    queryset = PurchaseOrder.objects.select_related('project').prefetch_related('items__material').order_by('-order_date')
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project']
    search_fields = ['po_number', 'vendor', 'remarks']

    def create(self, request, *args, **kwargs):
        mr_id = request.data.get('material_request')
        if not mr_id:
            return Response({'error': 'Material Request is required to create a Purchase Order.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from apps.procurement.models import MaterialRequest, PurchaseOrder
        try:
            mr = MaterialRequest.objects.get(id=mr_id)
            if mr.status != 'Approved':
                return Response({'error': 'Only approved Material Requests can be used to create a Purchase Order.'}, status=status.HTTP_400_BAD_REQUEST)
            if PurchaseOrder.objects.filter(material_request=mr).exists():
                return Response({'error': 'A Purchase Order already exists for this Material Request.'}, status=status.HTTP_400_BAD_REQUEST)
        except MaterialRequest.DoesNotExist:
            return Response({'error': 'Invalid Material Request.'}, status=status.HTTP_400_BAD_REQUEST)
                
        request_data = request.data.copy()
        if hasattr(request_data, '_mutable'):
            request_data._mutable = True
        request_data['status'] = 'Ordered'
        
        serializer = self.get_serializer(data=request_data)
        serializer.is_valid(raise_exception=True)
        
        from django.db import IntegrityError
        
        for _ in range(5):
            pos = PurchaseOrder.objects.all()
            max_num = 0
            for po in pos:
                try:
                    num = int(po.po_number.split('-')[-1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    pass
            next_num = max_num + 1
            po_number = f"PO-{next_num:04d}"
            
            try:
                with transaction.atomic():
                    serializer.save(po_number=po_number)
                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            except IntegrityError:
                continue
                
        return Response({'error': 'Unable to generate a unique Purchase Order number. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    rbac_module = 'purchase_orders'
    queryset = PurchaseOrderItem.objects.select_related('material', 'purchase_order').order_by('-id')
    serializer_class = PurchaseOrderItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['purchase_order', 'material']

    def perform_create(self, serializer):
        po = serializer.validated_data.get('purchase_order')
        quantity = serializer.validated_data.get('quantity')
        material = serializer.validated_data.get('material')
        
        if po.material_request:
            mr_item = po.material_request.items.filter(material=material).first()
            if mr_item:
                if quantity > mr_item.approved_quantity:
                    raise DRFValidationError(f"Ordered quantity ({quantity}) cannot exceed approved quantity ({mr_item.approved_quantity}) for {material.material_name}.")
                serializer.save(material_request_item=mr_item, boq_item=mr_item.boq_item)
                return
        serializer.save()


class GoodsReceiptViewSet(viewsets.ModelViewSet):
    rbac_module = 'material_receipts'
    queryset = GoodsReceipt.objects.select_related('purchase_order', 'project', 'site').prefetch_related('items').order_by('-receipt_date')
    serializer_class = GoodsReceiptSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['purchase_order', 'project', 'site']
    search_fields = ['supplier', 'remarks']

    def create(self, request, *args, **kwargs):
        """
        Expects:
        {
            "purchase_order": <id>,
            "project": <id>,
            "site": <id>,
            "receipt_date": "YYYY-MM-DD",
            "supplier": "...",
            "remarks": "...",
            "items": [{"po_item_id": <id>, "received_quantity": <qty>}, ...]
        }
        """
        items_data = request.data.get('items', [])
        if not items_data:
            return Response({'error': 'At least one item is required.'}, status=400)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                receipt = serializer.save(received_by=request.user)
                receive_goods(receipt, items_data, created_by=request.user)
        except (DjangoValidationError, DRFValidationError, Exception) as e:
            return Response({'error': str(e)}, status=400)

        return Response(GoodsReceiptSerializer(receipt).data, status=201)


class GoodsReceiptItemViewSet(viewsets.ModelViewSet):
    rbac_module = 'material_receipts'
    queryset = GoodsReceiptItem.objects.all().order_by('-id')
    serializer_class = GoodsReceiptItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['goods_receipt', 'po_item']


# Backward-compatible PurchaseRequest viewset
class PurchaseRequestViewSet(viewsets.ModelViewSet):
    rbac_module = 'material_requests'
    queryset = PurchaseRequest.objects.all().order_by('-request_date')
    serializer_class = PurchaseRequestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project', 'site']
    search_fields = ['request_number', 'remarks']

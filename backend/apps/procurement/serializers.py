from rest_framework import serializers
from .models import (
    MaterialRequest, MaterialRequestItem,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem,
    PurchaseRequest,
)


class MaterialRequestItemSerializer(serializers.ModelSerializer):
    material = serializers.PrimaryKeyRelatedField(read_only=True)
    material_name = serializers.CharField(source='material.material_name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    boq_item_detail = serializers.SerializerMethodField()

    class Meta:
        model = MaterialRequestItem
        fields = [
            'id', 'material_request', 'boq_item', 'boq_item_detail',
            'material', 'material_name', 'material_unit',
            'requested_quantity', 'approved_quantity', 'unit', 'remarks',
        ]

    def get_boq_item_detail(self, obj):
        if obj.boq_item:
            return {
                'id': obj.boq_item.id,
                'quantity': obj.boq_item.quantity,
                'consumed_quantity': obj.boq_item.consumed_quantity,
                'balance_quantity': obj.boq_item.balance_quantity,
            }
        return None


class MaterialRequestSerializer(serializers.ModelSerializer):
    items = MaterialRequestItemSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    location_details = serializers.CharField(source='project.project_location', read_only=True)
    site_name = serializers.CharField(source='site.site_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.username', read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id', 'request_number', 'project', 'project_name',
            'site', 'site_name', 'location_details', 'boq', 'requested_by', 'requested_by_name',
            'request_date', 'status', 'remarks', 'items',
            'approved_by', 'approved_by_name', 'action_date',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'request_number': {'read_only': True}
        }


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.material_name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    pending_quantity = serializers.ReadOnlyField()
    requested_quantity = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'purchase_order', 'material', 'material_name', 'material_unit',
            'boq_item', 'material_request_item',
            'quantity', 'unit_price', 'total_price',
            'received_quantity', 'pending_quantity', 'requested_quantity',
        ]

    def get_requested_quantity(self, obj):
        if obj.material_request_item:
            return obj.material_request_item.requested_quantity
        return obj.quantity


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    tax_amount = serializers.SerializerMethodField()
    grand_total = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    material_request_number = serializers.CharField(source='material_request.request_number', read_only=True)
    po_number = serializers.CharField(read_only=True)
    vendor_mobile = serializers.CharField(required=True, allow_blank=False)
    vendor_location = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'project', 'project_name', 'material_request', 'material_request_number',
            'vendor', 'vendor_mobile', 'vendor_location', 'order_date', 'expected_delivery_date',
            'tax_percentage', 'subtotal', 'tax_amount', 'grand_total',
            'status', 'remarks', 'items', 'created_at', 'updated_at',
        ]

    def _get_computed_totals(self, obj):
        if not hasattr(obj, '_cached_totals'):
            items = obj.items.all()
            subtotal = sum(((item.quantity or 0) * (item.unit_price or 0)) for item in items)
            tax_pct = obj.tax_percentage or 0
            tax_amount = round(subtotal * tax_pct / 100, 2)
            grand_total = subtotal + tax_amount
            obj._cached_totals = (subtotal, tax_amount, grand_total)
        return obj._cached_totals

    def get_subtotal(self, obj):
        return self._get_computed_totals(obj)[0]

    def get_tax_amount(self, obj):
        return self._get_computed_totals(obj)[1]

    def get_grand_total(self, obj):
        return self._get_computed_totals(obj)[2]



class GoodsReceiptItemSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='po_item.material.material_name', read_only=True)
    material_unit = serializers.CharField(source='po_item.material.unit', read_only=True)

    class Meta:
        model = GoodsReceiptItem
        fields = ['id', 'goods_receipt', 'po_item', 'material_name', 'material_unit', 'received_quantity']


class GoodsReceiptSerializer(serializers.ModelSerializer):
    items = GoodsReceiptItemSerializer(many=True, read_only=True)
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    site_name = serializers.CharField(source='site.site_name', read_only=True)
    location_details = serializers.CharField(source='project.project_location', read_only=True)

    class Meta:
        model = GoodsReceipt
        fields = [
            'id', 'purchase_order', 'po_number',
            'project', 'project_name', 'site', 'site_name', 'location_details',
            'receipt_date', 'supplier', 'received_by',
            'remarks', 'items', 'created_at',
        ]


# Backward compatibility
class PurchaseRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseRequest
        fields = '__all__'

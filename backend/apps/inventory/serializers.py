from rest_framework import serializers
from .models import Material, StockTransaction, ProjectMaterialStock

class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'

class StockTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransaction
        fields = '__all__'


class ProjectMaterialStockSerializer(serializers.ModelSerializer):
    material_name = serializers.SerializerMethodField()
    material_unit = serializers.SerializerMethodField()
    boq_qty = serializers.ReadOnlyField()
    consumed_qty = serializers.ReadOnlyField()
    available_stock = serializers.ReadOnlyField()
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    boq_number = serializers.CharField(source='boq_item.boq.boq_number', read_only=True)
    allocated_work_order_qty = serializers.SerializerMethodField()
    available_for_work_order = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMaterialStock
        fields = [
            'id', 'project', 'project_name', 'boq_item', 'boq_number',
            'material_name', 'material_unit',
            'boq_qty', 'issued_qty', 'consumed_qty', 'available_stock',
            'allocated_work_order_qty', 'available_for_work_order',
            'created_at', 'updated_at'
        ]

    def get_material_name(self, obj):
        return obj.boq_item.material.material_name if obj.boq_item.material else obj.boq_item.custom_material_name

    def get_material_unit(self, obj):
        return obj.boq_item.unit

    def get_allocated_work_order_qty(self, obj):
        from apps.subcontractors.models import SubcontractWorkOrder
        from django.db.models import Sum
        from decimal import Decimal
        total = SubcontractWorkOrder.objects.filter(
            boq_item=obj.boq_item
        ).exclude(status='Cancelled').aggregate(total=Sum('contract_quantity'))['total']
        return total or Decimal('0.00')

    def get_available_for_work_order(self, obj):
        return obj.available_stock - self.get_allocated_work_order_qty(obj)

import re
from rest_framework import serializers
from django.db import transaction
from django.db.models import Sum
from decimal import Decimal
from .models import Subcontractor, SubcontractWorkOrder, WorkProgress, SubcontractorBill

class SubcontractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcontractor
        fields = '__all__'
        extra_kwargs = {
            'subcontractor_name': {'required': True, 'allow_blank': False},
            'contact_person': {'required': True, 'allow_blank': False, 'allow_null': False},
            'mobile_number': {'required': True, 'allow_blank': False, 'allow_null': False},
            'email': {'required': True, 'allow_blank': False, 'allow_null': False},
            'address': {'required': True, 'allow_blank': False, 'allow_null': False},
            'work_category': {'required': True, 'allow_blank': False, 'allow_null': False},
            'status': {'required': True, 'allow_blank': False},
        }

    def validate_mobile_number(self, value):
        if value:
            value = value.strip()
            if not re.match(r'^[6-9]\d{9}$', value):
                raise serializers.ValidationError("Enter a valid 10-digit mobile number.")
        return value

    def validate_email(self, value):
        if value:
            value = value.strip()
        return value


class SubcontractWorkOrderSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    boq_item_details = serializers.SerializerMethodField(read_only=True)
    subcontractor_name = serializers.CharField(source='subcontractor.subcontractor_name', read_only=True)
    
    # Computed fields
    approved_quantity = serializers.SerializerMethodField(read_only=True)
    submitted_quantity_total = serializers.SerializerMethodField(read_only=True)
    billed_quantity = serializers.SerializerMethodField(read_only=True)
    balance_quantity = serializers.SerializerMethodField(read_only=True)
    remaining_work_quantity = serializers.SerializerMethodField(read_only=True)
    remaining_billable_quantity = serializers.SerializerMethodField(read_only=True)
    progress_percentage = serializers.SerializerMethodField(read_only=True)
    work_order_number = serializers.CharField(read_only=True)

    class Meta:
        model = SubcontractWorkOrder
        fields = '__all__'

    def get_boq_item_details(self, obj):
        if obj.boq_item:
            mat_name = obj.boq_item.material.material_name if obj.boq_item.material else obj.boq_item.custom_material_name
            return f"{obj.boq_item.boq.boq_number} - {mat_name}"
        return None

    def get_approved_quantity(self, obj):
        result = obj.progress_records.filter(status='Approved').aggregate(total=Sum('approved_quantity'))['total']
        return result or Decimal('0.00')

    def get_submitted_quantity_total(self, obj):
        result = obj.progress_records.exclude(status='Rejected').aggregate(total=Sum('submitted_quantity'))['total']
        return result or Decimal('0.00')

    def get_billed_quantity(self, obj):
        result = obj.bills.filter(status__in=['Draft', 'Submitted', 'Approved', 'Paid']).aggregate(total=Sum('bill_quantity'))['total']
        return result or Decimal('0.00')

    def get_balance_quantity(self, obj):
        return obj.contract_quantity - self.get_approved_quantity(obj)
        
    def get_remaining_work_quantity(self, obj):
        return obj.contract_quantity - self.get_submitted_quantity_total(obj)
        
    def get_remaining_billable_quantity(self, obj):
        return self.get_approved_quantity(obj) - self.get_billed_quantity(obj)

    def get_progress_percentage(self, obj):
        if obj.contract_quantity > 0:
            pct = (self.get_approved_quantity(obj) / obj.contract_quantity) * 100
            return round(pct, 2)
        return Decimal('0.00')

    def validate(self, attrs):
        # Validate quantity and rate
        if attrs.get('contract_quantity', 0) < 0:
            raise serializers.ValidationError({"contract_quantity": "Quantity cannot be negative."})
        if attrs.get('rate', 0) < 0:
            raise serializers.ValidationError({"rate": "Rate cannot be negative."})

        # Validate BOQ Item belongs to Project
        project = attrs.get('project')
        boq_item = attrs.get('boq_item')
        if project and boq_item:
            if boq_item.boq.project != project:
                raise serializers.ValidationError({"boq_item": "Selected BOQ item does not belong to the selected project."})

        # Validate material availability for SubcontractWorkOrder
        target_project = attrs.get('project', self.instance.project if self.instance else None)
        target_boq_item = attrs.get('boq_item', self.instance.boq_item if self.instance else None)
        target_status = attrs.get('status', self.instance.status if self.instance else 'Draft')

        if target_project and target_boq_item and target_status != 'Cancelled':
            from apps.inventory.models import ProjectMaterialStock
            p_stock = ProjectMaterialStock.objects.select_for_update().filter(boq_item=target_boq_item).first()
            available_stock = p_stock.available_stock if p_stock else Decimal('0.00')

            other_wos = SubcontractWorkOrder.objects.filter(
                boq_item=target_boq_item
            ).exclude(status='Cancelled')

            if self.instance:
                other_wos = other_wos.exclude(id=self.instance.id)

            allocated_qty = other_wos.aggregate(total=Sum('contract_quantity'))['total'] or Decimal('0.00')
            available_qty = available_stock - allocated_qty
            contract_quantity = attrs.get('contract_quantity', self.instance.contract_quantity if self.instance else Decimal('0.00'))

            if contract_quantity > available_qty:
                material_name = target_boq_item.material.material_name if target_boq_item.material else target_boq_item.custom_material_name
                raise serializers.ValidationError({
                    "detail": f"Insufficient stock. Only {available_qty} {target_boq_item.unit} of {material_name} are currently available for this project."
                })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # Generate work order number securely
        last_wo = SubcontractWorkOrder.objects.select_for_update().order_by('-id').first()
        if last_wo and last_wo.work_order_number.startswith('SWO-'):
            try:
                last_num = int(last_wo.work_order_number.split('-')[1])
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
            
        validated_data['work_order_number'] = f'SWO-{next_num:03d}'
        return super().create(validated_data)


class WorkProgressSerializer(serializers.ModelSerializer):
    work_order_number = serializers.CharField(source='work_order.work_order_number', read_only=True)
    subcontractor_name = serializers.CharField(source='work_order.subcontractor.subcontractor_name', read_only=True)
    project_name = serializers.CharField(source='work_order.project.project_name', read_only=True)
    project_id = serializers.IntegerField(source='work_order.project.id', read_only=True)
    work_order_unit = serializers.CharField(source='work_order.unit', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    material_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WorkProgress
        fields = '__all__'

    def get_material_name(self, obj):
        if obj.work_order and obj.work_order.boq_item:
            boq_item = obj.work_order.boq_item
            if boq_item.material and boq_item.material.material_name:
                return boq_item.material.material_name
            elif boq_item.custom_material_name:
                return boq_item.custom_material_name
        return "—"

    def validate(self, attrs):
        work_order = attrs.get('work_order')
        if self.instance:
            work_order = self.instance.work_order
            
        if work_order and work_order.status == 'Cancelled':
            raise serializers.ValidationError({"work_order": "Cannot submit progress for a cancelled work order."})
            
        return attrs


class SubcontractorBillSerializer(serializers.ModelSerializer):
    bill_number = serializers.CharField(read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    work_order_number = serializers.CharField(source='work_order.work_order_number', read_only=True)
    subcontractor_name = serializers.CharField(source='subcontractor.subcontractor_name', read_only=True)

    class Meta:
        model = SubcontractorBill
        fields = '__all__'
        read_only_fields = ['basic_amount', 'tax_amount', 'total_amount', 'project_cost']

    def validate(self, attrs):
        work_order = attrs.get('work_order')
        if not work_order and self.instance:
            work_order = self.instance.work_order

        if work_order and work_order.status == 'Cancelled':
            raise serializers.ValidationError({"work_order": "Cannot bill for a cancelled work order."})

        bill_quantity = attrs.get('bill_quantity')
        if bill_quantity is not None and bill_quantity < 0:
            raise serializers.ValidationError({"bill_quantity": "Bill quantity cannot be negative."})

        # Check available approved quantity
        if work_order and bill_quantity is not None:
            approved_qty = work_order.progress_records.filter(status='Approved').aggregate(total=Sum('approved_quantity'))['total'] or Decimal('0.00')
            
            # Exclude current bill if updating
            billed_query = work_order.bills.filter(status__in=['Draft', 'Submitted', 'Approved', 'Paid'])
            if self.instance:
                billed_query = billed_query.exclude(id=self.instance.id)
                
            billed_qty = billed_query.aggregate(total=Sum('bill_quantity'))['total'] or Decimal('0.00')
            
            available_qty = approved_qty - billed_qty
            
            if bill_quantity > available_qty:
                raise serializers.ValidationError({"bill_quantity": f"Bill quantity cannot exceed the available approved quantity ({available_qty})."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        last_bill = SubcontractorBill.objects.select_for_update().order_by('-id').first()
        if last_bill and last_bill.bill_number.startswith('SCB-'):
            try:
                last_num = int(last_bill.bill_number.split('-')[1])
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
            
        validated_data['bill_number'] = f'SCB-{next_num:03d}'
        return super().create(validated_data)

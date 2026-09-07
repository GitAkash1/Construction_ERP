from rest_framework import serializers
from django.db import transaction
from .models import Project, BOQ, BOQItem


from django.db import transaction

class ProjectSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(read_only=True)

    class Meta:
        model = Project
        fields = '__all__'

    def validate_client_mobile(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Client Mobile Number is required.")
        import re
        if not re.match(r'^\d{10}$', str(value).strip()):
            raise serializers.ValidationError("Client Mobile Number must be a valid 10-digit number.")
        return str(value).strip()

    def validate_client_address(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Client Address is required.")
        return str(value).strip()

    @transaction.atomic
    def create(self, validated_data):
        # Generate project code securely
        last_project = Project.objects.select_for_update().order_by('-id').first()
        if last_project and last_project.project_code.startswith('PRJ-'):
            try:
                last_num = int(last_project.project_code.split('-')[1])
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
            
        validated_data['project_code'] = f'PRJ-{next_num:03d}'
        return super().create(validated_data)


class BOQItemSerializer(serializers.ModelSerializer):
    material_name = serializers.SerializerMethodField()
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    balance_quantity = serializers.ReadOnlyField()
    consumption_percentage = serializers.ReadOnlyField()

    class Meta:
        model = BOQItem
        fields = [
            'id', 'boq', 'material', 'custom_material_name', 'material_name', 'material_unit',
            'description', 'quantity', 'unit', 'rate', 'total_amount',
            'consumed_quantity', 'balance_quantity', 'consumption_percentage',
        ]

    def get_material_name(self, obj):
        return obj.material.material_name if obj.material else obj.custom_material_name

    def create(self, validated_data):
        if not validated_data.get('material') and validated_data.get('custom_material_name'):
            from apps.inventory.models import Material
            custom_name = ' '.join(validated_data['custom_material_name'].split())
            unit = validated_data.get('unit', '').strip()
            matched = Material.objects.filter(material_name__iexact=custom_name).first()
            if matched:
                validated_data['material'] = matched
            else:
                mats = Material.objects.filter(material_code__startswith='MAT-').select_for_update()
                max_num = 0
                for m in mats:
                    try:
                        num = int(m.material_code.split('-')[1])
                        if num > max_num:
                            max_num = num
                    except (ValueError, IndexError):
                        pass
                next_num = max_num + 1
                new_code = f"MAT-{next_num:04d}"
                new_mat = Material.objects.create(
                    material_code=new_code,
                    material_name=custom_name,
                    unit=unit,
                    category="Auto-Generated"
                )
                validated_data['material'] = new_mat
            validated_data['custom_material_name'] = ""
            
        return super().create(validated_data)


class BOQItemWriteSerializer(serializers.ModelSerializer):
    custom_material_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = BOQItem
        fields = ['material', 'custom_material_name', 'quantity', 'unit', 'rate']
        extra_kwargs = {
            'material': {'required': False, 'allow_null': True}
        }


class BOQSerializer(serializers.ModelSerializer):
    items = BOQItemSerializer(many=True, read_only=True)
    items_data = BOQItemWriteSerializer(many=True, write_only=True, required=False)
    total_value = serializers.ReadOnlyField()
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    boq_number = serializers.CharField(read_only=True)

    class Meta:
        model = BOQ
        fields = ['id', 'project', 'project_name', 'boq_number', 'bill_date', 'title', 'description',
                  'total_value', 'items', 'items_data', 'created_at', 'updated_at']

    def validate(self, attrs):
        project = attrs.get('project')
        # Check if creating a new BOQ
        if self.instance is None and project:
            if BOQ.objects.filter(project=project).exists():
                raise serializers.ValidationError({"project": ["The BOQ for this project already exist"]})
        # Check if updating and changing the project
        elif self.instance and project and project != self.instance.project:
            if BOQ.objects.filter(project=project).exists():
                raise serializers.ValidationError({"project": ["The BOQ for this project already exist"]})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items_data', [])
        if not items_data:
            raise serializers.ValidationError({"items_data": "At least one material is required."})
            
        # Generate BOQ number securely
        last_boq = BOQ.objects.select_for_update().order_by('-id').first()
        if last_boq and last_boq.boq_number.startswith('BOQ-'):
            try:
                last_num = int(last_boq.boq_number.split('-')[1])
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
            
        validated_data['boq_number'] = f'BOQ-{next_num:03d}'
        
        boq = BOQ.objects.create(**validated_data)
        
        for item_data in items_data:
            if not item_data.get('material') and not item_data.get('custom_material_name'):
                raise serializers.ValidationError({"items_data": "Product Name cannot be empty."})
            if not item_data.get('unit'):
                raise serializers.ValidationError({"items_data": "Unit cannot be empty."})
            if item_data.get('quantity', 0) <= 0:
                raise serializers.ValidationError({"items_data": "Quantity must be greater than 0."})
            if item_data.get('rate', -1) < 0:
                raise serializers.ValidationError({"items_data": "Per Unit Price must be zero or greater."})
            # --- AUTO-LINK / AUTO-CREATE MATERIAL ---
            if not item_data.get('material') and item_data.get('custom_material_name'):
                from apps.inventory.models import Material
                custom_name = ' '.join(item_data['custom_material_name'].split())
                unit = item_data.get('unit', '').strip()
                matched = Material.objects.filter(material_name__iexact=custom_name).first()
                if matched:
                    item_data['material'] = matched
                else:
                    mats = Material.objects.filter(material_code__startswith='MAT-').select_for_update()
                    max_num = 0
                    for m in mats:
                        try:
                            num = int(m.material_code.split('-')[1])
                            if num > max_num:
                                max_num = num
                        except (ValueError, IndexError):
                            pass
                    next_num = max_num + 1
                    new_code = f"MAT-{next_num:04d}"
                    new_mat = Material.objects.create(
                        material_code=new_code,
                        material_name=custom_name,
                        unit=unit,
                        category="Auto-Generated"
                    )
                    item_data['material'] = new_mat
                item_data['custom_material_name'] = ""

            BOQItem.objects.create(boq=boq, **item_data)
            
        return boq

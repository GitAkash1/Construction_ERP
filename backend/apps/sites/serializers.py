from rest_framework import serializers
from .models import Site, DailyProgress, SiteConsumption, SiteConsumptionItem


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = '__all__'


class DailyProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyProgress
        fields = '__all__'


class SiteConsumptionItemSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.material_name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    total_cost = serializers.ReadOnlyField()

    class Meta:
        model = SiteConsumptionItem
        fields = [
            'id', 'consumption', 'material', 'material_name', 'material_unit',
            'boq_item', 'quantity', 'unit', 'unit_price', 'total_cost',
        ]


class SiteConsumptionSerializer(serializers.ModelSerializer):
    items = SiteConsumptionItemSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    site_name = serializers.CharField(source='site.site_name', read_only=True)
    location = serializers.CharField(source='project.project_location', read_only=True)

    class Meta:
        model = SiteConsumption
        fields = [
            'id', 'project', 'project_name', 'site', 'site_name', 'location',
            'consumption_date', 'activity', 'consumed_by',
            'remarks', 'items', 'created_at',
        ]

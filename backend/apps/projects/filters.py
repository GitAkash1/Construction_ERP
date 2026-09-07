import django_filters
from .models import Project

class ProjectFilter(django_filters.FilterSet):
    project_location = django_filters.CharFilter(lookup_expr='iexact')
    status = django_filters.CharFilter(lookup_expr='iexact')
    min_contract_value = django_filters.NumberFilter(field_name='estimated_budget', lookup_expr='gte')
    max_contract_value = django_filters.NumberFilter(field_name='estimated_budget', lookup_expr='lte')

    class Meta:
        model = Project
        fields = ['project_location', 'status', 'min_contract_value', 'max_contract_value']

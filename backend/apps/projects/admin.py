from django.contrib import admin
from .models import Project, BOQ, BOQItem


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['project_code', 'project_name', 'client_name', 'status', 'estimated_budget']
    search_fields = ['project_code', 'project_name', 'client_name']
    list_filter = ['status']


@admin.register(BOQ)
class BOQAdmin(admin.ModelAdmin):
    list_display = ['boq_number', 'project', 'title', 'created_at']
    search_fields = ['boq_number', 'title']
    list_filter = ['project']


@admin.register(BOQItem)
class BOQItemAdmin(admin.ModelAdmin):
    list_display = ['boq', 'material', 'quantity', 'unit', 'rate', 'total_amount', 'consumed_quantity']
    list_filter = ['boq']
    search_fields = ['material__material_name']

from django.contrib import admin
from .models import (
    MaterialRequest, MaterialRequestItem,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem,
    PurchaseRequest,
)


class MaterialRequestItemInline(admin.TabularInline):
    model = MaterialRequestItem
    extra = 1


@admin.register(MaterialRequest)
class MaterialRequestAdmin(admin.ModelAdmin):
    list_display = ['request_number', 'project', 'status', 'request_date']
    list_filter = ['status', 'project']
    search_fields = ['request_number']
    inlines = [MaterialRequestItemInline]


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'project', 'vendor', 'status', 'order_date']
    list_filter = ['status', 'project']
    search_fields = ['po_number', 'vendor']
    inlines = [PurchaseOrderItemInline]


class GoodsReceiptItemInline(admin.TabularInline):
    model = GoodsReceiptItem
    extra = 1


@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'purchase_order', 'project', 'site', 'receipt_date']
    list_filter = ['project']
    inlines = [GoodsReceiptItemInline]


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ['request_number', 'project', 'site', 'status', 'request_date']
    list_filter = ['status']

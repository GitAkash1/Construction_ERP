from django.db import models
from django.contrib.auth.models import User


class MaterialRequest(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Converted', 'Converted'),
    )
    request_number = models.CharField(max_length=50)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='material_requests')
    site = models.ForeignKey('sites.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_requests')
    boq = models.ForeignKey('projects.BOQ', on_delete=models.SET_NULL, null=True, blank=True, related_name='material_requests')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='material_requests')
    request_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    remarks = models.TextField(blank=True, null=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_material_requests')
    action_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('project', 'request_number')

    def __str__(self):
        return self.request_number


class MaterialRequestItem(models.Model):
    material_request = models.ForeignKey(MaterialRequest, on_delete=models.CASCADE, related_name='items')
    boq_item = models.ForeignKey('projects.BOQItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='request_items')
    material = models.ForeignKey('inventory.Material', on_delete=models.CASCADE, related_name='request_items')
    requested_quantity = models.DecimalField(max_digits=12, decimal_places=2)
    approved_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=50)
    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.material_request.request_number} - {self.material.material_name}"


class PurchaseOrder(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Ordered', 'Ordered'),
        ('Partially Received', 'Partially Received'),
        ('Received', 'Received'),
        ('Cancelled', 'Cancelled'),
    )
    po_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='purchase_orders')
    material_request = models.ForeignKey(MaterialRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders')
    vendor = models.CharField(max_length=200)
    vendor_mobile = models.CharField(max_length=15, blank=True, null=True)
    vendor_location = models.TextField(blank=True, null=True)
    order_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.po_number

    @property
    def subtotal(self):
        return sum(item.total_price for item in self.items.all())

    @property
    def tax_amount(self):
        return round(self.subtotal * self.tax_percentage / 100, 2)

    @property
    def grand_total(self):
        return self.subtotal + self.tax_amount

    def update_status(self):
        items = self.items.all()
        if not items.exists():
            return
        total_ordered = sum(i.quantity for i in items)
        total_received = sum(i.received_quantity for i in items)
        if total_received == 0:
            self.status = 'Ordered'
        elif total_received >= total_ordered:
            self.status = 'Received'
        else:
            self.status = 'Partially Received'
        self.save(update_fields=['status'])


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    material_request_item = models.ForeignKey(MaterialRequestItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='po_items')
    material = models.ForeignKey('inventory.Material', on_delete=models.CASCADE, related_name='po_items')
    boq_item = models.ForeignKey('projects.BOQItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='po_items')
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.material.material_name}"

    @property
    def pending_quantity(self):
        return self.quantity - self.received_quantity


class GoodsReceipt(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='receipts')
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='goods_receipts')
    site = models.ForeignKey('sites.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='goods_receipts')
    receipt_date = models.DateField()
    supplier = models.CharField(max_length=200, blank=True, null=True)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='goods_receipts')
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"GRN for {self.purchase_order.po_number} on {self.receipt_date}"


class GoodsReceiptItem(models.Model):
    goods_receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='items')
    po_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.CASCADE, related_name='receipt_items')
    received_quantity = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ('goods_receipt', 'po_item')

    def __str__(self):
        return f"GRN {self.goods_receipt.id} - {self.po_item.material.material_name} x {self.received_quantity}"


# ---- Backward-compatible PurchaseRequest (original model, kept for API compatibility) ----
class PurchaseRequest(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Converted', 'Converted'),
    )
    request_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='purchase_requests')
    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE, related_name='purchase_requests')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='purchase_requests')
    request_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.request_number


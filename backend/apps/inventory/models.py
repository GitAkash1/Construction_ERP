from django.db import models
from django.contrib.auth.models import User


class Material(models.Model):
    material_code = models.CharField(max_length=50, unique=True)
    material_name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    unit = models.CharField(max_length=50)  # e.g., kg, tons, bags, MT, m³
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    minimum_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.material_code} - {self.material_name}"


class StockTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('ADJ', 'Stock Adjustment'),
        ('REC', 'Material Receipt'),
        ('CON', 'Site Consumption'),
    )
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='transactions')
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_transactions')
    site = models.ForeignKey('sites.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_transactions')
    transaction_type = models.CharField(max_length=3, choices=TRANSACTION_TYPES)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=200, blank=True, null=True)
    transaction_date = models.DateField()
    remarks = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='stock_transactions')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.material.material_name} - {self.get_transaction_type_display()} - {self.quantity}"


class ProjectMaterialStock(models.Model):
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='project_stocks')
    boq_item = models.OneToOneField('projects.BOQItem', on_delete=models.CASCADE, related_name='project_stock')
    issued_qty = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        mat_name = self.boq_item.material.material_name if self.boq_item.material else self.boq_item.custom_material_name
        return f"{self.project.project_code} - {mat_name} Stock"

    @property
    def boq_qty(self):
        return self.boq_item.quantity

    @property
    def consumed_qty(self):
        return self.boq_item.consumed_quantity

    @property
    def available_stock(self):
        return self.issued_qty - self.consumed_qty

from django.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    STATUS_CHOICES = (
        ('Planned', 'Planned'),
        ('Active', 'Active'),
        ('On Hold', 'On Hold'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )

    project_code = models.CharField(max_length=50, unique=True)
    project_name = models.CharField(max_length=200)
    client_name = models.CharField(max_length=200)
    project_location = models.CharField(max_length=300)
    project_description = models.TextField(blank=True, null=True)
    client_mobile = models.CharField(max_length=20, blank=True, null=True)
    client_address = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    expected_end_date = models.DateField()
    actual_end_date = models.DateField(blank=True, null=True)
    estimated_budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.project_code} - {self.project_name}"


from django.utils import timezone

class BOQ(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='boqs')
    boq_number = models.CharField(max_length=50, unique=True)
    bill_date = models.DateField(default=timezone.now)
    title = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='boqs_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['project'], name='unique_project_boq')
        ]

    def __str__(self):
        return f"{self.boq_number} - {self.project.project_name}"

    @property
    def total_value(self):
        return sum(item.total_amount for item in self.items.all())


class BOQItem(models.Model):
    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name='items')
    # Use string reference to avoid circular import with inventory
    material = models.ForeignKey('inventory.Material', on_delete=models.CASCADE, related_name='boq_items', null=True, blank=True)
    custom_material_name = models.CharField(max_length=200, null=True, blank=True)
    description = models.CharField(max_length=300, blank=True, null=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=50)
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    consumed_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.rate
        super().save(*args, **kwargs)

    def __str__(self):
        mat_name = self.material.material_name if self.material else self.custom_material_name
        return f"{self.boq.boq_number} - {mat_name}"

    @property
    def balance_quantity(self):
        return self.quantity - self.consumed_quantity

    @property
    def consumption_percentage(self):
        if self.quantity == 0:
            return 0
        return round(float(self.consumed_quantity) / float(self.quantity) * 100, 2)

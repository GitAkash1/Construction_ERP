from django.db import models
from apps.projects.models import Project

class Contractor(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Completed', 'Completed'),
    )
    contractor_code = models.CharField(max_length=50, unique=True)
    contractor_name = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    specialization = models.CharField(max_length=200, blank=True, null=True)
    contract_start_date = models.DateField()
    contract_end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.contractor_code} - {self.company_name}"


class WorkOrder(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Active', 'Active'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )
    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE, related_name='work_orders')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='work_orders')
    work_description = models.TextField()
    agreed_amount = models.DecimalField(max_digits=14, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"WO: {self.contractor.company_name} - {self.project.project_code}"

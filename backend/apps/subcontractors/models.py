from django.db import models
from django.contrib.auth.models import User
from apps.projects.models import Project, BOQItem
from apps.finance.models import ProjectCost

class Subcontractor(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )
    subcontractor_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True, null=True)
    mobile_number = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    work_category = models.CharField(max_length=200, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.subcontractor_name


class SubcontractWorkOrder(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Issued', 'Issued'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )
    work_order_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='subcontract_work_orders')
    boq_item = models.ForeignKey(BOQItem, on_delete=models.CASCADE, related_name='subcontract_work_orders', null=True, blank=True)
    subcontractor = models.ForeignKey(Subcontractor, on_delete=models.CASCADE, related_name='work_orders')
    work_description = models.TextField()
    contract_quantity = models.DecimalField(max_digits=14, decimal_places=2)
    unit = models.CharField(max_length=50)
    rate = models.DecimalField(max_digits=14, decimal_places=2)
    contract_value = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    work_area = models.CharField(max_length=300, blank=True, null=True)
    planned_completion_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_subcontracts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.contract_value = self.contract_quantity * self.rate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.work_order_number} - {self.subcontractor.subcontractor_name}"


class WorkProgress(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )
    work_order = models.ForeignKey(SubcontractWorkOrder, on_delete=models.CASCADE, related_name='progress_records')
    measurement_date = models.DateField()
    submitted_quantity = models.DecimalField(max_digits=14, decimal_places=2)
    measurement_description = models.TextField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='submitted_measurements')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    
    # Approval fields
    approved_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_measurements')
    approved_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Prog {self.id} for {self.work_order.work_order_number}"


class SubcontractorBill(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Submitted', 'Submitted'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Paid', 'Paid'),
    )
    bill_number = models.CharField(max_length=50, unique=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='subcontractor_bills')
    work_order = models.ForeignKey(SubcontractWorkOrder, on_delete=models.CASCADE, related_name='bills')
    subcontractor = models.ForeignKey(Subcontractor, on_delete=models.CASCADE, related_name='bills')
    
    bill_date = models.DateField()
    bill_quantity = models.DecimalField(max_digits=14, decimal_places=2)
    rate = models.DecimalField(max_digits=14, decimal_places=2)
    basic_amount = models.DecimalField(max_digits=16, decimal_places=2)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=16, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    project_cost = models.ForeignKey(ProjectCost, on_delete=models.SET_NULL, null=True, blank=True, related_name='subcontractor_bills')
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_subcontractor_bills')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.basic_amount = self.bill_quantity * self.rate
        self.tax_amount = (self.basic_amount * self.tax_percentage) / 100
        self.total_amount = self.basic_amount + self.tax_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bill_number} - {self.subcontractor.subcontractor_name}"

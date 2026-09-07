from django.db import models
from django.contrib.auth.models import User
from apps.projects.models import Project


class Site(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Completed', 'Completed'),
    )
    site_name = models.CharField(max_length=200)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sites')
    site_location = models.CharField(max_length=300)
    site_manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_sites')
    start_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.site_name


class DailyProgress(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='daily_progress')
    date = models.DateField()
    work_description = models.TextField()
    progress_percentage = models.PositiveIntegerField(default=0)
    workers_count = models.PositiveIntegerField(default=0)
    remarks = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='progress_reports')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.site.site_name} - {self.date}"


class SiteConsumption(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='site_consumptions')
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='site_consumptions')
    consumption_date = models.DateField()
    activity = models.CharField(max_length=200)
    consumed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='consumptions')
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.project.project_name} - {self.site.site_name} - {self.consumption_date}"


class SiteConsumptionItem(models.Model):
    consumption = models.ForeignKey(SiteConsumption, on_delete=models.CASCADE, related_name='items')
    material = models.ForeignKey('inventory.Material', on_delete=models.CASCADE, related_name='consumption_items')
    boq_item = models.ForeignKey('projects.BOQItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='consumption_items')
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=50)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.consumption} - {self.material.material_name} x {self.quantity}"

    @property
    def total_cost(self):
        return self.quantity * self.unit_price

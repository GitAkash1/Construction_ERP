from django.db import models
from django.contrib.auth.models import User
from apps.projects.models import Project
from apps.sites.models import Site

class ProjectCost(models.Model):
    CATEGORY_CHOICES = (
        ('Material', 'Material'),
        ('Labour', 'Labour'),
        ('Contractor', 'Contractor'),
        ('Equipment', 'Equipment'),
        ('Transport', 'Transport'),
        ('Other', 'Other'),
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='costs')
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True, related_name='costs')
    cost_category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True, null=True) # Invoice number, PR number etc
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='recorded_costs')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project.project_code} - {self.cost_category} - {self.amount}"

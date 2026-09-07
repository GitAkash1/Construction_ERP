from django.contrib import admin
from .models import Subcontractor, SubcontractWorkOrder, WorkProgress, SubcontractorBill

admin.site.register(Subcontractor)
admin.site.register(SubcontractWorkOrder)
admin.site.register(WorkProgress)
admin.site.register(SubcontractorBill)

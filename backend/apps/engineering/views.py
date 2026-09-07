from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import *
from .serializers import *

class MilestoneViewSet(viewsets.ModelViewSet):
    rbac_module = 'engineering'
    queryset = Milestone.objects.all().order_by('-id')
    serializer_class = MilestoneSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'project']
    search_fields = ['milestone_name']

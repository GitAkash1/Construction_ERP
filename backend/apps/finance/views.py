from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from apps.accounts.permissions import RBACPermission
from .models import *
from .serializers import *
from .services import ProjectCostService

class ProjectCostViewSet(viewsets.ModelViewSet):
    rbac_module = 'finance_costs'
    queryset = ProjectCost.objects.all().order_by('-id')
    serializer_class = ProjectCostSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cost_category', 'project']
    search_fields = ['description', 'reference']

class ProjectCostTransactionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ProjectCostSummaryAPIView(APIView):
    permission_classes = [RBACPermission]
    rbac_module = 'finance_costs'

    def get(self, request, project_id):
        summary = ProjectCostService.get_summary(project_id)
        if summary is None:
            return Response({'error': 'Project not found.'}, status=404)
        return Response(summary)

class ProjectCostTransactionsAPIView(APIView):
    permission_classes = [RBACPermission]
    rbac_module = 'finance_costs'

    def get(self, request, project_id):
        category = request.query_params.get('category')
        date_val = request.query_params.get('date')
        
        transactions = ProjectCostService.get_transactions(project_id, category, date_val)
        
        paginator = ProjectCostTransactionPagination()
        paginated_transactions = paginator.paginate_queryset(transactions, request, view=self)
        return paginator.get_paginated_response(paginated_transactions)


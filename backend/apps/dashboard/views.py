from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, F, Q, DecimalField, Value
from django.db.models.functions import Coalesce

from apps.projects.models import Project, BOQ, BOQItem
from apps.procurement.models import PurchaseOrder, PurchaseOrderItem, GoodsReceipt
from apps.inventory.models import Material, StockTransaction
from apps.sites.models import SiteConsumption, SiteConsumptionItem
from apps.finance.models import ProjectCost


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_projects = Project.objects.count()
        active_projects = Project.objects.filter(status='Active').count()
        completed_projects = Project.objects.filter(status='Completed').count()
        delayed_projects = Project.objects.filter(status='Delayed').count()
        active_sites = __import__('apps.sites.models', fromlist=['Site']).Site.objects.filter(status='Active').count()
        pending_material_requests = __import__('apps.procurement.models', fromlist=['MaterialRequest']).MaterialRequest.objects.filter(status='Pending').count()
        low_stock_materials = Material.objects.filter(current_stock__lte=F('minimum_stock')).count()
        total_cost_agg = ProjectCost.objects.aggregate(total=Sum('amount'))
        total_project_cost = total_cost_agg['total'] or 0

        return Response({
            'total_projects': total_projects,
            'active_projects': active_projects,
            'completed_projects': completed_projects,
            'delayed_projects': delayed_projects,
            'active_sites': active_sites,
            'pending_material_requests': pending_material_requests,
            'low_stock_materials': low_stock_materials,
            'total_project_cost': total_project_cost,
        })


class ProjectMaterialSummaryView(APIView):
    """
    For a given project, shows:
    Material | BOQ Qty | Ordered | Received | Consumed | Available | BOQ Balance
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')

        # Get all BOQ items for the project
        boq_items = BOQItem.objects.filter(boq__project_id=project_id).select_related('material', 'boq')

        result = []
        for boq_item in boq_items:
            material = boq_item.material

            # Ordered qty (across all POs for this project)
            ordered = PurchaseOrderItem.objects.filter(
                material=material, purchase_order__project_id=project_id
            ).aggregate(total=Coalesce(Sum('quantity'), 0))['total']

            # Received qty
            received = PurchaseOrderItem.objects.filter(
                material=material, purchase_order__project_id=project_id
            ).aggregate(total=Coalesce(Sum('received_quantity'), 0))['total']

            # Consumed qty
            consumed = SiteConsumptionItem.objects.filter(
                material=material, consumption__project_id=project_id
            ).aggregate(total=Coalesce(Sum('quantity'), 0))['total']

            available = received - consumed

            result.append({
                'material_id': material.id,
                'material_code': material.material_code,
                'material_name': material.material_name,
                'unit': material.unit,
                'boq_qty': boq_item.quantity,
                'ordered': ordered,
                'received': received,
                'consumed': consumed,
                'available': available,
                'boq_balance': boq_item.balance_quantity,
                'consumption_pct': boq_item.consumption_percentage,
            })

        return Response(result)


class BOQConsumptionReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        boq_items = BOQItem.objects.filter(boq__project_id=project_id).select_related('material')
        result = [
            {
                'material_name': item.material.material_name,
                'unit': item.unit,
                'boq_qty': item.quantity,
                'consumed_qty': item.consumed_quantity,
                'balance_qty': item.balance_quantity,
                'consumption_pct': item.consumption_percentage,
            }
            for item in boq_items
        ]
        return Response(result)


class POStatusReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        qs = PurchaseOrder.objects.prefetch_related('items__material')
        if project_id:
            qs = qs.filter(project_id=project_id)
        result = []
        for po in qs:
            for item in po.items.all():
                result.append({
                    'po_number': po.po_number,
                    'vendor': po.vendor,
                    'material_name': item.material.material_name,
                    'unit': item.material.unit,
                    'ordered_qty': item.quantity,
                    'received_qty': item.received_quantity,
                    'pending_qty': item.pending_quantity,
                    'unit_price': item.unit_price,
                    'subtotal': item.total_price,
                    'tax_pct': po.tax_percentage,
                    'tax_amount': po.tax_amount,
                    'grand_total': po.grand_total,
                    'status': po.status,
                })
        return Response(result)


class SiteStockReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        site_id = request.query_params.get('site')

        # Get unique materials with REC transactions for this project
        receipt_qs = StockTransaction.objects.filter(transaction_type='REC')
        cons_qs = StockTransaction.objects.filter(transaction_type='CON')
        if project_id:
            receipt_qs = receipt_qs.filter(project_id=project_id)
            cons_qs = cons_qs.filter(project_id=project_id)
        if site_id:
            receipt_qs = receipt_qs.filter(site_id=site_id)
            cons_qs = cons_qs.filter(site_id=site_id)

        material_ids = set(
            list(receipt_qs.values_list('material_id', flat=True)) +
            list(cons_qs.values_list('material_id', flat=True))
        )
        result = []
        for mat_id in material_ids:
            material = Material.objects.get(pk=mat_id)
            received = receipt_qs.filter(material_id=mat_id).aggregate(total=Coalesce(Sum('quantity'), 0))['total']
            consumed = cons_qs.filter(material_id=mat_id).aggregate(total=Coalesce(Sum('quantity'), 0))['total']
            result.append({
                'material_name': material.material_name,
                'unit': material.unit,
                'received': received,
                'consumed': consumed,
                'available': received - consumed,
            })
        return Response(result)


class ProjectCostSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project query param required.'}, status=400)
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found.'}, status=404)

        po_items = PurchaseOrderItem.objects.filter(purchase_order__project=project)
        po_value = po_items.aggregate(
            total=Coalesce(
                Sum('total_price'),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
                output_field=DecimalField(max_digits=14, decimal_places=2)
            )
        )['total']
        received_value = sum(
            item.received_quantity * item.unit_price for item in po_items
        )
        pending_value = sum(
            item.pending_quantity * item.unit_price for item in po_items
        )

        # Consumed value
        cons_items = SiteConsumptionItem.objects.filter(consumption__project=project)
        consumed_value = sum(item.quantity * item.unit_price for item in cons_items)

        # Remaining stock value
        remaining_stock_value = received_value - consumed_value

        # BOQ value
        boq_value = sum(
            item.total_amount for boq in project.boqs.all() for item in boq.items.all()
        )

        return Response({
            'project': project.project_name,
            'contract_value': project.estimated_budget,
            'boq_value': boq_value,
            'po_value': po_value,
            'received_value': received_value,
            'consumed_value': consumed_value,
            'remaining_stock_value': remaining_stock_value,
            'pending_po_value': pending_value,
        })

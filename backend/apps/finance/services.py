from decimal import Decimal
from django.db.models import Sum, F, Q
from django.utils import timezone
from apps.projects.models import Project, BOQ
from apps.procurement.models import PurchaseOrderItem, GoodsReceiptItem, PurchaseOrder
from apps.subcontractors.models import SubcontractWorkOrder, SubcontractorBill
from apps.finance.models import ProjectCost

class ProjectCostService:
    @staticmethod
    def get_summary(project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return None

        # 1. Project Budget
        boq = BOQ.objects.filter(project=project).first()
        if boq:
            project_budget = boq.items.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        else:
            project_budget = project.estimated_budget

        # 2. Material Cost (GRN based)
        material_actual = GoodsReceiptItem.objects.filter(
            goods_receipt__project_id=project_id
        ).exclude(
            goods_receipt__purchase_order__status='Cancelled'
        ).aggregate(
            total=Sum(F('received_quantity') * F('po_item__unit_price'))
        )['total'] or Decimal('0.00')

        # Material Committed (Unreceived PO items)
        material_committed = PurchaseOrderItem.objects.filter(
            purchase_order__project_id=project_id,
            purchase_order__status__in=['Ordered', 'Partially Received']
        ).aggregate(
            total=Sum((F('quantity') - F('received_quantity')) * F('unit_price'))
        )['total'] or Decimal('0.00')

        # 3, 4, 5, 6: ProjectCost Aggregates (Contractor, Labour, Equipment, Other)
        cost_aggs = ProjectCost.objects.filter(project_id=project_id).values('cost_category').annotate(total=Sum('amount'))
        cost_map = {c['cost_category']: (c['total'] or Decimal('0.00')) for c in cost_aggs}

        subcontract_actual = cost_map.get('Contractor', Decimal('0.00'))
        labour_actual = cost_map.get('Labour', Decimal('0.00'))
        equipment_actual = cost_map.get('Equipment', Decimal('0.00'))
        other_actual = sum(
            total for cat, total in cost_map.items() 
            if cat not in ['Contractor', 'Labour', 'Equipment']
        ) or Decimal('0.00')

        # Subcontract Committed (Active Work Orders contract_value - approved bills)
        subcontract_committed = Decimal('0.00')
        wos = SubcontractWorkOrder.objects.filter(
            project_id=project_id,
            status__in=['Issued', 'In Progress']
        ).prefetch_related('bills')
        for wo in wos:
            approved_bills_sum = sum(
                b.total_amount for b in wo.bills.all()
                if b.status in ['Approved', 'Paid']
            ) or Decimal('0.00')
            subcontract_committed += max(Decimal('0.00'), wo.contract_value - approved_bills_sum)


        # Aggregated Totals
        actual_cost = material_actual + subcontract_actual + labour_actual + equipment_actual + other_actual
        committed_cost = material_committed + subcontract_committed
        projected_final_cost = actual_cost + committed_cost
        remaining_budget = project_budget - actual_cost

        # Cost Utilization
        if project_budget > 0:
            cost_utilization = round((actual_cost / project_budget) * 100, 2)
        else:
            cost_utilization = None

        return {
            'project_id': project.id,
            'project_name': project.project_name,
            'project_budget': project_budget,
            'actual_cost': actual_cost,
            'committed_cost': committed_cost,
            'projected_final_cost': projected_final_cost,
            'remaining_budget': remaining_budget,
            'cost_utilization_percentage': cost_utilization,
            'breakdown': {
                'material': material_actual,
                'labour': labour_actual,
                'subcontract': subcontract_actual,
                'equipment': equipment_actual,
                'other': other_actual
            }
        }

    @staticmethod
    def get_transactions(project_id, category_filter=None, date_filter=None):
        transactions = []

        # 1. Material Receipts (Actual Cost)
        grn_items = GoodsReceiptItem.objects.filter(
            goods_receipt__project_id=project_id
        ).exclude(
            goods_receipt__purchase_order__status='Cancelled'
        ).select_related('goods_receipt__purchase_order', 'po_item__material')

        for item in grn_items:
            amt = item.received_quantity * item.po_item.unit_price
            transactions.append({
                'date': item.goods_receipt.receipt_date,
                'cost_category': 'Material',
                'description': f"Receipt of {item.po_item.material.material_name} x {item.received_quantity}",
                'reference': f"GRN-{item.goods_receipt.id} / {item.goods_receipt.purchase_order.po_number}",
                'amount': amt,
                'status': 'Received'
            })

        # 2. Material PO Commitments (Committed Cost)
        po_items = PurchaseOrderItem.objects.filter(
            purchase_order__project_id=project_id,
            purchase_order__status__in=['Ordered', 'Partially Received']
        ).select_related('purchase_order', 'material')

        for item in po_items:
            pending_qty = item.quantity - item.received_quantity
            if pending_qty > 0:
                amt = pending_qty * item.unit_price
                transactions.append({
                    'date': item.purchase_order.order_date,
                    'cost_category': 'Material',
                    'description': f"PO Pending Commitment: {item.material.material_name} x {pending_qty}",
                    'reference': item.purchase_order.po_number,
                    'amount': amt,
                    'status': 'Committed'
                })

        # 3. Subcontract Work Order Commitments (Committed Cost)
        wos = SubcontractWorkOrder.objects.filter(
            project_id=project_id,
            status__in=['Issued', 'In Progress']
        ).prefetch_related('bills')

        for wo in wos:
            approved_bills_sum = sum(
                b.total_amount for b in wo.bills.all()
                if b.status in ['Approved', 'Paid']
            ) or Decimal('0.00')
            remaining_val = wo.contract_value - approved_bills_sum
            if remaining_val > 0:
                date_val = wo.planned_completion_date or wo.created_at.date()
                transactions.append({
                    'date': date_val,
                    'cost_category': 'Subcontract',
                    'description': f"Work Order Commitment: {wo.work_description[:60]}",
                    'reference': wo.work_order_number,
                    'amount': remaining_val,
                    'status': 'Committed'
                })

        # 4. Project Costs (Manual & Integrated Subcontractor Bills - Actual Cost)
        project_costs = ProjectCost.objects.filter(project_id=project_id)
        for pc in project_costs:
            cat = 'Other'
            if pc.cost_category == 'Contractor':
                cat = 'Subcontract'
            elif pc.cost_category == 'Labour':
                cat = 'Labour'
            elif pc.cost_category == 'Equipment':
                cat = 'Equipment'
            elif pc.cost_category == 'Material':
                cat = 'Material'

            transactions.append({
                'date': pc.date,
                'cost_category': cat,
                'description': pc.description,
                'reference': pc.reference or f"PC-{pc.id}",
                'amount': pc.amount,
                'status': 'Approved'
            })

        # Apply Filters
        if category_filter:
            transactions = [t for t in transactions if t['cost_category'].lower() == category_filter.lower()]
        
        if date_filter:
            transactions = [t for t in transactions if str(t['date']) == str(date_filter)]

        # Sort by Date descending
        transactions.sort(key=lambda x: x['date'], reverse=True)

        return transactions

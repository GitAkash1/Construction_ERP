from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import F
from django.utils import timezone
from datetime import datetime

from apps.projects.models import Project
from apps.procurement.models import MaterialRequest, PurchaseOrder, GoodsReceipt
from apps.inventory.models import ProjectMaterialStock, Material
from apps.sites.models import SiteConsumption
from apps.subcontractors.models import SubcontractWorkOrder, WorkProgress, SubcontractorBill
from apps.accounts.permissions import get_user_rbac_data


class WorkCenterView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id')
        user_rbac = get_user_rbac_data(request.user)
        user_perms = set(user_rbac['permissions'])

        # 1. Fetch All Active Projects (for dropdown select)
        all_projects = Project.objects.filter(status='Active').order_by('project_name')
        projects_list = [
            {
                'id': p.id,
                'project_code': p.project_code,
                'project_name': p.project_name
            }
            for p in all_projects
        ]

        # --- Filter Setup ---
        p_filter = {}
        wp_filter = {}
        if project_id:
            p_filter['project_id'] = project_id
            wp_filter['work_order__project_id'] = project_id

        # --- Overview calculations ---
        # Card 1: Active Projects Count
        if project_id:
            active_projects_count = Project.objects.filter(id=project_id, status='Active').count()
        else:
            active_projects_count = all_projects.count()

        # Item Counts
        mr_pending_count = MaterialRequest.objects.filter(status='Pending', **p_filter).count() if 'material_requests.view' in user_perms else 0
        wp_pending_count = WorkProgress.objects.filter(status='Pending', **wp_filter).count() if 'measurements.view' in user_perms else 0
        bill_pending_count = SubcontractorBill.objects.filter(status='Submitted', **p_filter).count() if 'subcontractor_bills.view' in user_perms else 0
        pending_approvals_count = mr_pending_count + wp_pending_count + bill_pending_count

        stock_qs = ProjectMaterialStock.objects.annotate(
            available=F('issued_qty') - F('boq_item__consumed_quantity')
        ).filter(available__lte=0, **p_filter) if 'stock.view' in user_perms else ProjectMaterialStock.objects.none()
        stock_alerts_count = stock_qs.count() if 'stock.view' in user_perms else 0

        open_wo_count = SubcontractWorkOrder.objects.filter(
            status__in=['Draft', 'Issued', 'In Progress'],
            **p_filter
        ).count() if 'work_orders.view' in user_perms else 0

        overview = {
            'active_projects': active_projects_count,
            'pending_approvals': pending_approvals_count,
            'stock_alerts': stock_alerts_count,
            'open_work_orders': open_wo_count
        }

        # --- My Actions Configuration ---
        candidate_actions = [
            {
                'title': 'Review Material Requests',
                'description': 'Review pending material requests',
                'route': '/procurement/requests',
                'count': mr_pending_count,
                'permission': 'material_requests.approve'
            },
            {
                'title': 'Review Measurements',
                'description': 'Review pending subcontractor measurements',
                'route': '/subcontractors/measurements',
                'count': wp_pending_count,
                'permission': 'measurements.approve'
            },
            {
                'title': 'Review Bills',
                'description': 'Review submitted subcontractor bills',
                'route': '/subcontractors/bills',
                'count': bill_pending_count,
                'permission': 'subcontractor_bills.approve'
            },
            {
                'title': 'Check Project Stock',
                'description': 'View available project materials',
                'route': '/inventory/stock',
                'count': stock_alerts_count,
                'permission': 'stock.view'
            },
            {
                'title': 'Manage Work Orders',
                'description': 'View subcontractor work orders',
                'route': '/subcontractors/work-orders',
                'count': open_wo_count,
                'permission': 'work_orders.view'
            },
            {
                'title': 'Material Requests',
                'description': 'Create or manage material requests',
                'route': '/procurement/requests',
                'count': mr_pending_count,
                'permission': 'material_requests.create'
            },
            {
                'title': 'Site Consumption',
                'description': 'Log site material consumption',
                'route': '/inventory/consumption',
                'count': SiteConsumption.objects.filter(**p_filter).count() if 'site_consumption.view' in user_perms else 0,
                'permission': 'site_consumption.create'
            },
            {
                'title': 'Purchase Orders',
                'description': 'Manage vendor purchase orders',
                'route': '/procurement/orders',
                'count': PurchaseOrder.objects.filter(status='Ordered', **p_filter).count() if 'purchase_orders.view' in user_perms else 0,
                'permission': 'purchase_orders.create'
            },
            {
                'title': 'Material Receipts',
                'description': 'Receive vendor material deliveries',
                'route': '/procurement/receipts',
                'count': GoodsReceipt.objects.filter(**p_filter).count() if 'material_receipts.view' in user_perms else 0,
                'permission': 'material_receipts.create'
            },
            {
                'title': 'Project Costs',
                'description': 'Track and view project expenses',
                'route': '/finance/costs',
                'count': 0,
                'permission': 'finance_costs.view'
            },
            {
                'title': 'Finance Reports',
                'description': 'View project financial summary reports',
                'route': '/finance/reports',
                'count': 0,
                'permission': 'finance_reports.view'
            }
        ]

        # Filter actions by user permissions, deduplicating routes if necessary
        actions = []
        seen_titles = set()
        for act in candidate_actions:
            if act['permission'] in user_perms and act['title'] not in seen_titles:
                actions.append({
                    'title': act['title'],
                    'description': act['description'],
                    'route': act['route'],
                    'count': act['count']
                })
                seen_titles.add(act['title'])

        # --- Attention Required Section ---
        attention_required = []

        # 1. Stock Alerts (Priority 1)
        if 'stock.view' in user_perms:
            for stock in stock_qs.select_related('project', 'boq_item__material')[:20]:
                mat_name = stock.boq_item.material.material_name if stock.boq_item.material else stock.boq_item.custom_material_name
                attention_required.append({
                    'date': stock.updated_at.strftime('%Y-%m-%d'),
                    'type': 'Stock Alert',
                    'project': stock.project.project_name,
                    'reference': mat_name,
                    'status': 'Out of Stock',
                    'action': 'View',
                    'route': '/inventory/stock',
                    'priority': 1
                })

        # 2. Material Requests (Priority 2)
        if 'material_requests.view' in user_perms:
            mr_qs = MaterialRequest.objects.filter(status='Pending', **p_filter).select_related('project')[:20]
            for mr in mr_qs:
                attention_required.append({
                    'date': mr.request_date.strftime('%Y-%m-%d') if mr.request_date else mr.created_at.strftime('%Y-%m-%d'),
                    'type': 'Material Request',
                    'project': mr.project.project_name,
                    'reference': mr.request_number,
                    'status': 'Pending',
                    'action': 'Review' if 'material_requests.approve' in user_perms else 'View',
                    'route': '/procurement/requests',
                    'priority': 2
                })

        # 3. Measurement Approval (Priority 2)
        if 'measurements.view' in user_perms:
            wp_qs = WorkProgress.objects.filter(status='Pending', **wp_filter).select_related(
                'work_order__project', 'work_order__subcontractor'
            )[:20]
            for wp in wp_qs:
                attention_required.append({
                    'date': wp.measurement_date.strftime('%Y-%m-%d') if wp.measurement_date else wp.created_at.strftime('%Y-%m-%d'),
                    'type': 'Measurement',
                    'project': wp.work_order.project.project_name,
                    'reference': f"{wp.work_order.work_order_number} - {wp.work_order.subcontractor.subcontractor_name}",
                    'status': 'Pending',
                    'action': 'Review' if 'measurements.approve' in user_perms else 'View',
                    'route': '/subcontractors/measurements',
                    'priority': 2
                })

        # 4. Subcontractor Bills (Priority 3)
        if 'subcontractor_bills.view' in user_perms:
            bill_qs = SubcontractorBill.objects.filter(status='Submitted', **p_filter).select_related(
                'project', 'subcontractor'
            )[:20]
            for bill in bill_qs:
                attention_required.append({
                    'date': bill.bill_date.strftime('%Y-%m-%d') if bill.bill_date else bill.created_at.strftime('%Y-%m-%d'),
                    'type': 'Subcontractor Bill',
                    'project': bill.project.project_name,
                    'reference': bill.bill_number,
                    'status': 'Submitted',
                    'action': 'Review' if 'subcontractor_bills.approve' in user_perms else 'View',
                    'route': '/subcontractors/bills',
                    'priority': 3
                })

        # Sort attention required by Priority first, then by Date descending
        attention_required.sort(key=lambda x: (x['priority'], x['date']), reverse=False)

        # --- Recent Activity Section ---
        activities = []

        def format_dt(dt):
            if not dt:
                return '', '', None
            local_dt = timezone.localtime(dt)
            return local_dt.strftime('%Y-%m-%d'), local_dt.strftime('%I:%M %p'), local_dt

        if 'material_requests.view' in user_perms:
            for x in MaterialRequest.objects.filter(**p_filter).select_related('project').order_by('-created_at')[:10]:
                d, t, ts = format_dt(x.created_at)
                activities.append({
                    'type': 'Material Request',
                    'reference': x.request_number,
                    'project': x.project.project_name,
                    'description': f"Material Request {x.request_number} submitted for {x.project.project_name}",
                    'date': d,
                    'time': t,
                    'timestamp': ts
                })

        if 'purchase_orders.view' in user_perms:
            for x in PurchaseOrder.objects.filter(**p_filter).select_related('project').order_by('-created_at')[:10]:
                d, t, ts = format_dt(x.created_at)
                activities.append({
                    'type': 'Purchase Order',
                    'reference': x.po_number,
                    'project': x.project.project_name,
                    'description': f"Purchase Order {x.po_number} created for {x.project.project_name} (Vendor: {x.vendor})",
                    'date': d,
                    'time': t,
                    'timestamp': ts
                })

        if 'material_receipts.view' in user_perms:
            for x in GoodsReceipt.objects.filter(**p_filter).select_related('project', 'purchase_order').order_by('-created_at')[:10]:
                d, t, ts = format_dt(x.created_at)
                activities.append({
                    'type': 'Material Receipt',
                    'reference': f"GRN {x.id}",
                    'project': x.project.project_name if x.project else '',
                    'description': f"Material receipt recorded for {x.purchase_order.po_number} from {x.supplier or 'vendor'}",
                    'date': d,
                    'time': t,
                    'timestamp': ts
                })

        if 'site_consumption.view' in user_perms:
            for x in SiteConsumption.objects.filter(**p_filter).select_related('project', 'site').order_by('-created_at')[:10]:
                d, t, ts = format_dt(x.created_at)
                activities.append({
                    'type': 'Site Consumption',
                    'reference': f"SC {x.id}",
                    'project': x.project.project_name,
                    'description': f"Activity: {x.activity} consumption recorded at {x.project.project_name} - {x.site.site_name}",
                    'date': d,
                    'time': t,
                    'timestamp': ts
                })

        if 'work_orders.view' in user_perms:
            for x in SubcontractWorkOrder.objects.filter(**p_filter).select_related('project', 'subcontractor').order_by('-created_at')[:10]:
                d, t, ts = format_dt(x.created_at)
                activities.append({
                    'type': 'Work Order',
                    'reference': x.work_order_number,
                    'project': x.project.project_name,
                    'description': f"Subcontractor Work Order {x.work_order_number} created for {x.subcontractor.subcontractor_name}",
                    'date': d,
                    'time': t,
                    'timestamp': ts
                })

        if 'measurements.view' in user_perms:
            for x in WorkProgress.objects.filter(**wp_filter).select_related('work_order__project', 'work_order__subcontractor').order_by('-created_at')[:10]:
                d, t, ts = format_dt(x.created_at)
                activities.append({
                    'type': 'Measurement',
                    'reference': f"WO {x.work_order.work_order_number} Progress",
                    'project': x.work_order.project.project_name,
                    'description': f"Measurement submitted for Work Order {x.work_order.work_order_number} ({x.submitted_quantity} {x.work_order.unit})",
                    'date': d,
                    'time': t,
                    'timestamp': ts
                })

        if 'subcontractor_bills.view' in user_perms:
            for x in SubcontractorBill.objects.filter(**p_filter).select_related('project', 'subcontractor').order_by('-created_at')[:10]:
                d, t, ts = format_dt(x.created_at)
                activities.append({
                    'type': 'Bill',
                    'reference': x.bill_number,
                    'project': x.project.project_name,
                    'description': f"Subcontractor Bill {x.bill_number} submitted for {x.subcontractor.subcontractor_name}",
                    'date': d,
                    'time': t,
                    'timestamp': ts
                })

        # Sort all activities by timestamp descending
        activities.sort(key=lambda x: x['timestamp'] if x['timestamp'] else timezone.now(), reverse=True)
        recent_activity = [
            {
                'type': act['type'],
                'reference': act['reference'],
                'project': act['project'],
                'description': act['description'],
                'date': act['date'],
                'time': act['time']
            }
            for act in activities[:10]
        ]

        # --- Quick Access ---
        candidate_quick_access = [
            {'name': 'Projects', 'route': '/projects', 'permission': 'projects.view'},
            {'name': 'BOQ', 'route': '/boq', 'permission': 'boq.view'},
            {'name': 'Material Requests', 'route': '/procurement/requests', 'permission': 'material_requests.view'},
            {'name': 'Purchase Orders', 'route': '/procurement/orders', 'permission': 'purchase_orders.view'},
            {'name': 'Material Receipts', 'route': '/procurement/receipts', 'permission': 'material_receipts.view'},
            {'name': 'Stock', 'route': '/inventory/stock', 'permission': 'stock.view'},
            {'name': 'Site Consumption', 'route': '/inventory/consumption', 'permission': 'site_consumption.view'},
            {'name': 'Subcontractor Work Orders', 'route': '/subcontractors/work-orders', 'permission': 'work_orders.view'},
            {'name': 'Measurement Approval', 'route': '/subcontractors/measurements', 'permission': 'measurements.view'},
            {'name': 'Subcontractor Bills', 'route': '/subcontractors/bills', 'permission': 'subcontractor_bills.view'},
            {'name': 'Finance Reports', 'route': '/finance/reports', 'permission': 'finance_reports.view'}
        ]
        quick_access = [
            {'name': qa['name'], 'route': qa['route']}
            for qa in candidate_quick_access
            if qa['permission'] in user_perms
        ]

        return Response({
            'overview': overview,
            'actions': actions,
            'attention_required': attention_required,
            'recent_activity': recent_activity,
            'quick_access': quick_access,
            'projects': projects_list
        })

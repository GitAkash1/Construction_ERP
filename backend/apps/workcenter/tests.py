from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from datetime import date

from apps.projects.models import Project, BOQ, BOQItem
from apps.procurement.models import MaterialRequest
from apps.inventory.models import Material, ProjectMaterialStock
from apps.subcontractors.models import Subcontractor, SubcontractWorkOrder, WorkProgress, SubcontractorBill


class WorkCenterAPITestCase(TestCase):
    def setUp(self):
        from apps.accounts.models import Role, UserRole
        self.client = APIClient()
        self.user = User.objects.create_user(username='testadmin', password='password123', is_staff=True)
        super_admin_role, _ = Role.objects.get_or_create(code='SUPER_ADMIN', defaults={'name': 'Super Admin'})
        UserRole.objects.create(user=self.user, role=super_admin_role)
        self.client.force_authenticate(user=self.user)

        # Create active project
        self.project_active = Project.objects.create(
            project_code='P001',
            project_name='Active Project 1',
            client_name='Client A',
            project_location='Loc A',
            start_date=date(2026, 1, 1),
            expected_end_date=date(2026, 12, 31),
            status='Active'
        )

        # Create planned project
        self.project_planned = Project.objects.create(
            project_code='P002',
            project_name='Planned Project 2',
            client_name='Client B',
            project_location='Loc B',
            start_date=date(2026, 1, 1),
            expected_end_date=date(2026, 12, 31),
            status='Planned'
        )

        # Create material
        self.material = Material.objects.create(
            material_code='MAT001',
            material_name='Cement',
            category='Raw',
            unit='Bags',
            current_stock=100,
            minimum_stock=10,
            unit_price=350
        )

        # Create BOQs and Items
        self.boq = BOQ.objects.create(
            project=self.project_active,
            boq_number='BOQ-001',
            title='BOQ 1',
            created_by=self.user
        )
        self.boq_item = BOQItem.objects.create(
            boq=self.boq,
            material=self.material,
            quantity=500,
            unit='Bags',
            rate=350,
            consumed_quantity=100
        )

        # Create project material stock (alert condition: issued_qty - consumed_qty <= 0)
        self.project_stock = ProjectMaterialStock.objects.create(
            project=self.project_active,
            boq_item=self.boq_item,
            issued_qty=80  # consumed_qty is 100, so available is 80 - 100 = -20 (Stock Alert!)
        )

        # Create pending material request
        self.mr_pending = MaterialRequest.objects.create(
            request_number='MR-001',
            project=self.project_active,
            requested_by=self.user,
            request_date=date(2026, 8, 20),
            status='Pending'
        )

        # Create subcontractor
        self.subcontractor = Subcontractor.objects.create(
            subcontractor_name='Subbie A',
            status='Active'
        )

        # Create subcontractor work order
        self.work_order = SubcontractWorkOrder.objects.create(
            work_order_number='WO-001',
            project=self.project_active,
            boq_item=self.boq_item,
            subcontractor=self.subcontractor,
            work_description='Plastering',
            contract_quantity=100,
            unit='Sft',
            rate=50,
            status='In Progress',
            created_by=self.user
        )

        # Create pending measurement progress
        self.progress_pending = WorkProgress.objects.create(
            work_order=self.work_order,
            measurement_date=date(2026, 8, 22),
            submitted_quantity=10,
            status='Pending',
            submitted_by=self.user
        )

        # Create submitted bill
        self.bill_submitted = SubcontractorBill.objects.create(
            bill_number='BILL-001',
            project=self.project_active,
            work_order=self.work_order,
            subcontractor=self.subcontractor,
            bill_date=date(2026, 8, 23),
            bill_quantity=10,
            rate=50,
            status='Submitted',
            created_by=self.user
        )

    def test_work_center_data_all_projects(self):
        url = reverse('work-center')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        res_data = response.data
        self.assertIn('overview', res_data)
        self.assertIn('actions', res_data)
        self.assertIn('attention_required', res_data)
        self.assertIn('recent_activity', res_data)
        self.assertIn('quick_access', res_data)
        self.assertIn('projects', res_data)

        # Check overview counts
        overview = res_data['overview']
        # Active Projects (should be 1 - project_active is active, project_planned is planned)
        self.assertEqual(overview['active_projects'], 1)
        # Pending approvals (1 MR pending + 1 WP pending + 1 Bill submitted = 3)
        self.assertEqual(overview['pending_approvals'], 3)
        # Stock alerts (1 stock has issued_qty = 80, consumed = 100, so available = -20 <= 0 -> 1)
        self.assertEqual(overview['stock_alerts'], 1)
        # Open Work Orders (1 WO in progress -> 1)
        self.assertEqual(overview['open_work_orders'], 1)

        # Check project lists
        self.assertEqual(len(res_data['projects']), 1)
        self.assertEqual(res_data['projects'][0]['project_code'], 'P001')

    def test_work_center_data_filtered_project(self):
        # Filter for the active project
        url = f"{reverse('work-center')}?project_id={self.project_active.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        overview = response.data['overview']
        self.assertEqual(overview['active_projects'], 1)
        self.assertEqual(overview['pending_approvals'], 3)

        # Filter for the planned project (should have 0 active, 0 pending, 0 stock alerts, 0 open WOs)
        url_planned = f"{reverse('work-center')}?project_id={self.project_planned.id}"
        response_planned = self.client.get(url_planned)
        self.assertEqual(response_planned.status_code, status.HTTP_200_OK)
        
        overview_planned = response_planned.data['overview']
        self.assertEqual(overview_planned['active_projects'], 0)
        self.assertEqual(overview_planned['pending_approvals'], 0)
        self.assertEqual(overview_planned['stock_alerts'], 0)
        self.assertEqual(overview_planned['open_work_orders'], 0)

from django.test import TestCase
from django.contrib.auth.models import User
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import Role, Permission, RolePermission, UserRole

class RBACTestCase(TestCase):
    def setUp(self):
        call_command('seed_rbac')
        self.client = APIClient()

    def test_seed_rbac_command(self):
        self.assertEqual(Role.objects.count(), 7)
        self.assertTrue(Permission.objects.filter(code='projects.view').exists())
        self.assertTrue(User.objects.filter(username='admin').exists())
        self.assertTrue(User.objects.filter(username='site_engineer').exists())

    def test_login_returns_rbac_info(self):
        res = self.client.post('/api/auth/login/', {'username': 'site_engineer', 'password': 'site_engineer@123'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertEqual(data['username'], 'site_engineer')
        self.assertEqual(data['role'], 'Site Engineer')
        self.assertEqual(data['roleCode'], 'SITE_ENGINEER')
        self.assertIn('material_requests.create', data['permissions'])
        self.assertNotIn('purchase_orders.create', data['permissions'])

    def test_check_auth_returns_rbac_info(self):
        user = User.objects.get(username='finance_manager')
        self.client.force_authenticate(user=user)
        res = self.client.get('/api/auth/check/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertTrue(data['isAuthenticated'])
        self.assertEqual(data['roleCode'], 'FINANCE_MANAGER')
        self.assertIn('subcontractor_bills.approve', data['permissions'])

    def test_api_permission_enforcement_allowed_vs_forbidden(self):
        se_user = User.objects.get(username='site_engineer')
        self.client.force_authenticate(user=se_user)

        # Site engineer has projects.view -> GET /api/projects/projects/ allowed (200)
        res = self.client.get('/api/projects/projects/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Site engineer does NOT have purchase_orders.create -> POST /api/procurement/purchase-orders/ forbidden (403)
        res_po = self.client.post('/api/procurement/purchase-orders/', {'vendor': 'Test'})
        self.assertEqual(res_po.status_code, status.HTTP_403_FORBIDDEN)

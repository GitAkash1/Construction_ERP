from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.accounts.models import Role, Permission, RolePermission, UserRole

class Command(BaseCommand):
    help = 'Seeds RBAC roles, permissions, role-permission mappings, and UAT users.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting RBAC Seeding...'))

        # 1. Define Roles
        roles_data = [
            ('Super Admin', 'SUPER_ADMIN', 'Full system control'),
            ('Project Manager', 'PROJECT_MANAGER', 'Project-level management and oversight'),
            ('Site Engineer', 'SITE_ENGINEER', 'Site operations and field execution'),
            ('Procurement Manager', 'PROCUREMENT_MANAGER', 'Material requests and purchase order management'),
            ('Store Manager', 'STORE_MANAGER', 'Inventory, stock, and material receipts management'),
            ('Finance Manager', 'FINANCE_MANAGER', 'Cost tracking and subcontractor bill processing'),
            ('Subcontractor Manager', 'SUBCONTRACTOR_MANAGER', 'Subcontractors, work orders, measurements, and billing'),
        ]

        roles_dict = {}
        for name, code, desc in roles_data:
            role, created = Role.objects.get_or_create(code=code, defaults={'name': name, 'description': desc})
            if not created and role.name != name:
                role.name = name
                role.save()
            roles_dict[code] = role
        self.stdout.write(self.style.SUCCESS(f'Processed {len(roles_dict)} roles.'))

        # 2. Define Permissions
        permissions_def = {
            'projects': ['view', 'create', 'edit', 'delete'],
            'boq': ['view', 'create', 'edit'],
            'engineering': ['view', 'create', 'edit'],
            'sites': ['view', 'create', 'edit'],
            'site_progress': ['view', 'create', 'edit'],
            'materials': ['view', 'create', 'edit'],
            'stock': ['view', 'create', 'edit'],
            'site_consumption': ['view', 'create', 'edit'],
            'material_requests': ['view', 'create', 'edit', 'approve'],
            'purchase_orders': ['view', 'create', 'edit', 'delete'],
            'material_receipts': ['view', 'create', 'edit'],
            'subcontractors': ['view', 'create', 'edit', 'delete'],
            'work_orders': ['view', 'create', 'edit', 'delete'],
            'measurements': ['view', 'create', 'edit', 'approve'],
            'subcontractor_bills': ['view', 'create', 'edit', 'approve'],
            'finance_costs': ['view', 'create', 'edit'],
            'finance_reports': ['view'],
            'users': ['view', 'create', 'edit', 'delete'],
            'roles': ['view', 'create', 'edit', 'delete'],
            'permissions': ['view', 'create', 'edit', 'delete'],
        }

        perms_dict = {}
        for module, actions in permissions_def.items():
            for action in actions:
                code = f"{module}.{action}"
                name = f"{action.capitalize()} {module.replace('_', ' ').title()}"
                perm, _ = Permission.objects.get_or_create(
                    code=code,
                    defaults={'name': name, 'module': module, 'action': action}
                )
                perms_dict[code] = perm
        self.stdout.write(self.style.SUCCESS(f'Processed {len(perms_dict)} permissions.'))

        # 3. Role-Permission Matrix Mapping
        all_perm_codes = list(perms_dict.keys())

        matrix = {
            'SUPER_ADMIN': all_perm_codes,

            'PROJECT_MANAGER': [
                'projects.view', 'projects.create', 'projects.edit',
                'boq.view', 'boq.create', 'boq.edit',
                'engineering.view', 'engineering.create', 'engineering.edit',
                'sites.view',
                'site_progress.view', 'site_progress.create', 'site_progress.edit',
                'material_requests.view', 'material_requests.create', 'material_requests.approve',
                'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit', 'purchase_orders.delete',
                'material_receipts.view', 'material_receipts.create', 'material_receipts.edit',
                'materials.view',
                'stock.view',
                'site_consumption.view', 'site_consumption.create', 'site_consumption.edit',
                'subcontractors.view', 'subcontractors.create', 'subcontractors.edit', 'subcontractors.delete',
                'work_orders.view', 'work_orders.create', 'work_orders.edit', 'work_orders.delete',
                'measurements.view', 'measurements.create', 'measurements.edit', 'measurements.approve',
                'subcontractor_bills.view', 'subcontractor_bills.create', 'subcontractor_bills.edit', 'subcontractor_bills.approve',
                'finance_costs.view', 'finance_costs.create', 'finance_costs.edit',
                'finance_reports.view',
            ],

            'SITE_ENGINEER': [
                'boq.view',
                'engineering.view', 'engineering.create', 'engineering.edit',
                'sites.view', 'sites.create', 'sites.edit',
                'site_progress.view', 'site_progress.create', 'site_progress.edit',
                'material_requests.view', 'material_requests.create', 'material_requests.edit',
                'materials.view',
                'stock.view',
                'site_consumption.view', 'site_consumption.create', 'site_consumption.edit',
                'purchase_orders.view', 'purchase_orders.create',
                'material_receipts.view', 'material_receipts.create',
                'subcontractors.view',
                'work_orders.view', 'work_orders.create',
                'measurements.view', 'measurements.create', 'measurements.edit',
            ],

            'PROCUREMENT_MANAGER': [
                'projects.view',
                'boq.view',
                'material_requests.view', 'material_requests.create', 'material_requests.edit', 'material_requests.approve',
                'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit', 'purchase_orders.delete',
                'material_receipts.view', 'material_receipts.create', 'material_receipts.edit',
                'materials.view',
                'stock.view',
                'subcontractors.view',
                'finance_costs.view',
            ],

            'STORE_MANAGER': [
                'projects.view',
                'boq.view',
                'materials.view', 'materials.create', 'materials.edit',
                'stock.view', 'stock.create', 'stock.edit',
                'material_requests.view',
                'purchase_orders.view',
                'material_receipts.view', 'material_receipts.create', 'material_receipts.edit',
                'site_consumption.view', 'site_consumption.create', 'site_consumption.edit',
                'subcontractors.view',
                'work_orders.view',
            ],

            'FINANCE_MANAGER': [
                'projects.view',
                'boq.view',
                'material_requests.view',
                'purchase_orders.view',
                'material_receipts.view',
                'subcontractors.view',
                'work_orders.view',
                'measurements.view',
                'subcontractor_bills.view', 'subcontractor_bills.approve',
                'finance_costs.view', 'finance_costs.create', 'finance_costs.edit',
                'finance_reports.view',
            ],

            'SUBCONTRACTOR_MANAGER': [
                'projects.view',
                'boq.view',
                'subcontractors.view', 'subcontractors.create', 'subcontractors.edit', 'subcontractors.delete',
                'work_orders.view', 'work_orders.create', 'work_orders.edit', 'work_orders.delete',
                'measurements.view', 'measurements.create', 'measurements.edit', 'measurements.approve',
                'subcontractor_bills.view', 'subcontractor_bills.create', 'subcontractor_bills.edit',
                'stock.view',
            ]
        }

        for role_code, perm_codes in matrix.items():
            role = roles_dict[role_code]
            # Remove permissions not in matrix
            RolePermission.objects.filter(role=role).exclude(permission__code__in=perm_codes).delete()
            for p_code in perm_codes:
                if p_code in perms_dict:
                    RolePermission.objects.get_or_create(role=role, permission=perms_dict[p_code])

        self.stdout.write(self.style.SUCCESS('Role-Permission mappings updated.'))

        # 4. UAT Users Definition
        uat_users = [
            ('admin', 'admin@123', 'SUPER_ADMIN', True),
            ('project_manager', 'project_manager@123', 'PROJECT_MANAGER', False),
            ('site_engineer', 'site_engineer@123', 'SITE_ENGINEER', False),
            ('procurement_manager', 'procurement_manager@123', 'PROCUREMENT_MANAGER', False),
            ('store_manager', 'store_manager@123', 'STORE_MANAGER', False),
            ('finance_manager', 'finance_manager@123', 'FINANCE_MANAGER', False),
            ('subcontractor_manager', 'subcontractor_manager@123', 'SUBCONTRACTOR_MANAGER', False),
        ]

        for username, password, role_code, is_staff in uat_users:
            user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.create_user(username=username, password=password, is_staff=is_staff)
                self.stdout.write(self.style.SUCCESS(f'Created user: {username}'))
            else:
                user.set_password(password)
                user.is_staff = is_staff
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Updated user password/staff status: {username}'))

            role = roles_dict[role_code]
            UserRole.objects.get_or_create(user=user, role=role)

        self.stdout.write(self.style.SUCCESS('RBAC Seeding completed successfully!'))

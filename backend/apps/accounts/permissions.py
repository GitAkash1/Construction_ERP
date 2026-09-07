from rest_framework import permissions
from .models import UserRole, RolePermission, Permission

ALL_PERMISSIONS = [
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'boq.view', 'boq.create', 'boq.edit',
    'engineering.view', 'engineering.create', 'engineering.edit',
    'sites.view', 'sites.create', 'sites.edit',
    'site_progress.view', 'site_progress.create', 'site_progress.edit',
    'materials.view', 'materials.create', 'materials.edit',
    'stock.view', 'stock.create', 'stock.edit',
    'site_consumption.view', 'site_consumption.create', 'site_consumption.edit',
    'material_requests.view', 'material_requests.create', 'material_requests.edit', 'material_requests.approve',
    'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit', 'purchase_orders.delete',
    'material_receipts.view', 'material_receipts.create', 'material_receipts.edit',
    'subcontractors.view', 'subcontractors.create', 'subcontractors.edit', 'subcontractors.delete',
    'work_orders.view', 'work_orders.create', 'work_orders.edit', 'work_orders.delete',
    'measurements.view', 'measurements.create', 'measurements.edit', 'measurements.approve',
    'subcontractor_bills.view', 'subcontractor_bills.create', 'subcontractor_bills.edit', 'subcontractor_bills.approve',
    'finance_costs.view', 'finance_costs.create', 'finance_costs.edit',
    'finance_reports.view',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
    'permissions.view', 'permissions.create', 'permissions.edit', 'permissions.delete',
]

def get_user_rbac_data(user):
    """
    Returns user role name, role code, and list of permission codes.
    """
    if not user or not user.is_authenticated:
        return {'role': None, 'roleCode': None, 'permissions': []}
    
    user_role = UserRole.objects.filter(user=user).select_related('role').first()
    if not user_role or not user_role.role.is_active:
        return {'role': None, 'roleCode': None, 'permissions': []}
    
    role = user_role.role
    if role.code == 'SUPER_ADMIN':
        db_perms = list(Permission.objects.filter(is_active=True).values_list('code', flat=True))
        all_perms = list(set(db_perms + ALL_PERMISSIONS))
        return {'role': role.name, 'roleCode': role.code, 'permissions': all_perms}
    
    perms = list(
        RolePermission.objects.filter(role=role, permission__is_active=True)
        .values_list('permission__code', flat=True)
    )
    return {'role': role.name, 'roleCode': role.code, 'permissions': perms}


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    The request is authenticated as a user, or is a read-only request.
    Only users with is_staff=True have write permissions.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user.is_staff


class RBACPermission(permissions.BasePermission):
    """
    Granular RBAC permission class based on user roles and permissions.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Get user role
        user_role = UserRole.objects.filter(user=request.user).select_related('role').first()
        if not user_role or not user_role.role.is_active:
            return False

        role_code = user_role.role.code

        # Super Admin bypasses all check constraints
        if role_code == 'SUPER_ADMIN':
            return True

        # Check action overrides (e.g. custom ViewSet actions like approve/reject)
        action_name = getattr(view, 'action', None)
        rbac_action_map = getattr(view, 'rbac_action_map', {})

        if action_name and action_name in rbac_action_map:
            required_perm = rbac_action_map[action_name]
        else:
            rbac_module = getattr(view, 'rbac_module', None)
            if not rbac_module:
                # If no module configured, default to allowing authenticated users
                return True

            if request.method in permissions.SAFE_METHODS:
                action_type = 'view'
            elif request.method == 'POST':
                action_type = 'create'
            elif request.method in ['PUT', 'PATCH']:
                action_type = 'edit'
            elif request.method == 'DELETE':
                action_type = 'delete'
            else:
                action_type = 'view'

            required_perm = f"{rbac_module}.{action_type}"

        # Verify role has required permission
        return RolePermission.objects.filter(
            role=user_role.role,
            permission__code=required_perm,
            permission__is_active=True
        ).exists()

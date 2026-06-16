from django.db import transaction

from .models import Module, Permission, Role, RolePermission, UserRole


class RoleAssignmentService:
    @staticmethod
    @transaction.atomic
    def assign_role(user, role, institution=None, branch=None):
        assignment, _ = UserRole.objects.get_or_create(
            user=user,
            role=role,
            institution=institution,
            branch=branch,
            defaults={"is_active": True},
        )
        if not assignment.is_active:
            assignment.is_active = True
            assignment.save(update_fields=["is_active", "updated_at"])
        return assignment


class PermissionSyncService:
    @staticmethod
    @transaction.atomic
    def ensure_permission(module_code, module_name, action, code, feature=None, description=""):
        module, _ = Module.objects.get_or_create(code=module_code, defaults={"name": module_name})
        permission, _ = Permission.objects.update_or_create(
            code=code,
            defaults={"module": module, "feature": feature, "action": action, "description": description},
        )
        return permission

    @staticmethod
    @transaction.atomic
    def sync_role_permissions(role, permissions):
        RolePermission.objects.filter(role=role).exclude(permission__in=permissions).delete()
        for permission in permissions:
            RolePermission.objects.get_or_create(role=role, permission=permission)
        return role


class AccessPolicyEvaluationService:
    @staticmethod
    def can(user, permission_code):
        from .selectors import user_has_permission

        return user_has_permission(user, permission_code)

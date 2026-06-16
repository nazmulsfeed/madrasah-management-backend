from rest_framework.permissions import BasePermission

from .selectors import user_has_permission


class HasRBACPermission(BasePermission):
    required_permission = None

    def has_permission(self, request, view):
        permission_code = getattr(view, "required_permission", self.required_permission)
        if not permission_code:
            return request.user and request.user.is_authenticated
        return user_has_permission(request.user, permission_code)

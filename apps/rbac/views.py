from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.viewsets import ModelViewSet

from .models import AccessPolicy, Feature, Module, Permission, Role, UserRole
from .permissions import HasRBACPermission
from .serializers import (
    AccessPolicySerializer,
    FeatureSerializer,
    ModuleSerializer,
    PermissionSerializer,
    RoleSerializer,
    UserRoleSerializer,
)


class RBACDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "dashboards/rbac.html"


class ModuleViewSet(ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [HasRBACPermission]
    required_permission = "rbac.manage"


class FeatureViewSet(ModelViewSet):
    queryset = Feature.objects.select_related("module")
    serializer_class = FeatureSerializer
    permission_classes = [HasRBACPermission]
    required_permission = "rbac.manage"


class PermissionViewSet(ModelViewSet):
    queryset = Permission.objects.select_related("module", "feature")
    serializer_class = PermissionSerializer
    permission_classes = [HasRBACPermission]
    required_permission = "rbac.manage"


class RoleViewSet(ModelViewSet):
    queryset = Role.objects.prefetch_related("permissions")
    serializer_class = RoleSerializer
    permission_classes = [HasRBACPermission]
    required_permission = "rbac.manage"


class UserRoleViewSet(ModelViewSet):
    queryset = UserRole.objects.select_related("user", "role", "institution", "branch")
    serializer_class = UserRoleSerializer
    permission_classes = [HasRBACPermission]
    required_permission = "rbac.manage"


class AccessPolicyViewSet(ModelViewSet):
    queryset = AccessPolicy.objects.select_related("role", "module")
    serializer_class = AccessPolicySerializer
    permission_classes = [HasRBACPermission]
    required_permission = "rbac.manage"

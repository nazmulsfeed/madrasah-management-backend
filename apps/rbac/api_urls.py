from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AccessPolicyViewSet, FeatureViewSet, ModuleViewSet, PermissionViewSet, RoleViewSet, UserRoleViewSet

router = DefaultRouter()
router.register("modules", ModuleViewSet)
router.register("features", FeatureViewSet)
router.register("permissions", PermissionViewSet)
router.register("roles", RoleViewSet)
router.register("user-roles", UserRoleViewSet)
router.register("access-policies", AccessPolicyViewSet)

urlpatterns = [path("", include(router.urls))]

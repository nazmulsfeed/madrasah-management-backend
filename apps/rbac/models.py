from django.conf import settings
from django.db import models

from apps.common.models import ActiveStatusModel, InstitutionScopedModel, TimeStampedModel, UUIDModel


class Module(UUIDModel, TimeStampedModel, ActiveStatusModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Feature(UUIDModel, TimeStampedModel, ActiveStatusModel):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="features")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100)

    class Meta:
        ordering = ["module__order", "name"]
        constraints = [models.UniqueConstraint(fields=["module", "code"], name="unique_feature_per_module")]

    def __str__(self):
        return f"{self.module.code}.{self.code}"


class Permission(UUIDModel, TimeStampedModel, ActiveStatusModel):
    ACTION_VIEW = "view"
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_APPROVE = "approve"
    ACTION_EXPORT = "export"
    ACTION_MANAGE = "manage"
    ACTION_CHOICES = (
        (ACTION_VIEW, "View"),
        (ACTION_CREATE, "Create"),
        (ACTION_UPDATE, "Update"),
        (ACTION_DELETE, "Delete"),
        (ACTION_APPROVE, "Approve"),
        (ACTION_EXPORT, "Export"),
        (ACTION_MANAGE, "Manage"),
    )

    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="permissions")
    feature = models.ForeignKey(Feature, null=True, blank=True, on_delete=models.CASCADE, related_name="permissions")
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    code = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.code


class Role(UUIDModel, TimeStampedModel, ActiveStatusModel):
    SCOPE_GLOBAL = "global"
    SCOPE_INSTITUTION = "institution"
    SCOPE_BRANCH = "branch"
    SCOPE_CHOICES = (
        (SCOPE_GLOBAL, "Global"),
        (SCOPE_INSTITUTION, "Institution"),
        (SCOPE_BRANCH, "Branch"),
    )

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default=SCOPE_BRANCH)
    priority = models.PositiveIntegerField(default=100)
    is_system_role = models.BooleanField(default=False)
    permissions = models.ManyToManyField(Permission, through="RolePermission", related_name="roles")

    class Meta:
        ordering = ["priority", "name"]

    def __str__(self):
        return self.name


class RolePermission(UUIDModel, TimeStampedModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name="role_permissions")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["role", "permission"], name="unique_role_permission")]


class UserRole(UUIDModel, TimeStampedModel, ActiveStatusModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="user_roles")
    institution = models.ForeignKey("common.Institution", null=True, blank=True, on_delete=models.CASCADE)
    branch = models.ForeignKey("common.Branch", null=True, blank=True, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "role", "institution", "branch"], name="unique_user_role_scope")
        ]

    def __str__(self):
        return f"{self.user} -> {self.role}"


class AccessPolicy(UUIDModel, TimeStampedModel, ActiveStatusModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="access_policies")
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="access_policies")
    conditions = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)

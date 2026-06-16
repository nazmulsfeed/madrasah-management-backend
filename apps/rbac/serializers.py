from rest_framework import serializers

from .models import AccessPolicy, Feature, Module, Permission, Role, RolePermission, UserRole


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = "__all__"


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = "__all__"


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = "__all__"


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = "__all__"


class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = "__all__"


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = "__all__"


class AccessPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPolicy
        fields = "__all__"

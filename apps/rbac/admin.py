from django.contrib import admin

from .models import AccessPolicy, Feature, Module, Permission, Role, RolePermission, UserRole

admin.site.register(AccessPolicy)
admin.site.register(Feature)
admin.site.register(Module)
admin.site.register(Permission)
admin.site.register(Role)
admin.site.register(RolePermission)
admin.site.register(UserRole)

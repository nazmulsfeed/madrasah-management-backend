from django.contrib import admin

from .models import AcademicYear, Address, AuditLog, Branch, Institution

admin.site.register(AcademicYear)
admin.site.register(Address)
admin.site.register(AuditLog)
admin.site.register(Branch)
admin.site.register(Institution)

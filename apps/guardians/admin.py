from django.contrib import admin

from .models import Guardian, GuardianContactPreference, StudentGuardian

admin.site.register(Guardian)
admin.site.register(GuardianContactPreference)
admin.site.register(StudentGuardian)

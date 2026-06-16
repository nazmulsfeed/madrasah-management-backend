from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import CustomUserChangeForm, CustomUserCreationForm
from .models import AccountVerification, LoginHistory, PasswordResetRequest, User, UserDevice, UserProfile, UserSession


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = User
    list_display = ("username", "email", "user_type", "institution", "branch", "is_active", "is_staff")
    list_filter = ("user_type", "is_active", "is_staff", "institution", "branch")
    fieldsets = UserAdmin.fieldsets + (
        ("Madrasah Scope", {"fields": ("user_type", "phone", "photo", "institution", "branch")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Madrasah Scope", {"fields": ("email", "user_type", "phone", "institution", "branch")}),
    )


admin.site.register(AccountVerification)
admin.site.register(LoginHistory)
admin.site.register(PasswordResetRequest)
admin.site.register(UserDevice)
admin.site.register(UserProfile)
admin.site.register(UserSession)

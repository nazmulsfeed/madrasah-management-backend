from django.contrib.auth import authenticate, login, logout
from django.db import transaction

from .models import LoginHistory, User, UserProfile


class UserCreationService:
    @staticmethod
    @transaction.atomic
    def create_user(**data):
        password = data.pop("password", None)
        user = User.objects.create_user(password=password, **data)
        UserProfile.objects.get_or_create(user=user)
        return user


class UserActivationService:
    @staticmethod
    def set_active(user, is_active):
        user.is_active = is_active
        user.save(update_fields=["is_active"])
        return user


class LoginAuditService:
    @staticmethod
    def record(request, user=None, was_successful=True):
        if user is None or not getattr(user, "is_authenticated", False):
            return None
        return LoginHistory.objects.create(
            user=user,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            was_successful=was_successful,
        )


class AuthenticationService:
    @staticmethod
    def login(request, username, password):
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            LoginAuditService.record(request, user, True)
        return user

    @staticmethod
    def logout(request):
        logout(request)


class ProfileService:
    @staticmethod
    @transaction.atomic
    def update_profile(user, user_data, profile_data):
        for field, value in user_data.items():
            setattr(user, field, value)
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.save()
        return profile


class PasswordResetService:
    """Password reset workflow is exposed through Django's battle-tested auth views."""

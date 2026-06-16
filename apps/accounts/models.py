import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import ActiveStatusModel, InstitutionScopedModel, TimeStampedModel, UUIDModel
from .managers import UserManager


class User(AbstractUser):
    USER_TYPE_SUPER_ADMIN = "super_admin"
    USER_TYPE_ADMIN = "admin"
    USER_TYPE_PRINCIPAL = "principal"
    USER_TYPE_VICE_PRINCIPAL = "vice_principal"
    USER_TYPE_TEACHER = "teacher"
    USER_TYPE_HIFZ_TEACHER = "hifz_teacher"
    USER_TYPE_ACCOUNTANT = "accountant"
    USER_TYPE_ADMISSION_OFFICER = "admission_officer"
    USER_TYPE_HOSTEL_MANAGER = "hostel_manager"
    USER_TYPE_LIBRARY_MANAGER = "library_manager"
    USER_TYPE_STUDENT = "student"
    USER_TYPE_GUARDIAN = "guardian"
    USER_TYPE_CHOICES = (
        (USER_TYPE_SUPER_ADMIN, "Super Admin"),
        (USER_TYPE_ADMIN, "Admin"),
        (USER_TYPE_PRINCIPAL, "Principal"),
        (USER_TYPE_VICE_PRINCIPAL, "Vice Principal"),
        (USER_TYPE_TEACHER, "Teacher"),
        (USER_TYPE_HIFZ_TEACHER, "Hifz Teacher"),
        (USER_TYPE_ACCOUNTANT, "Accountant"),
        (USER_TYPE_ADMISSION_OFFICER, "Admission Officer"),
        (USER_TYPE_HOSTEL_MANAGER, "Hostel Manager"),
        (USER_TYPE_LIBRARY_MANAGER, "Library Manager"),
        (USER_TYPE_STUDENT, "Student"),
        (USER_TYPE_GUARDIAN, "Guardian"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True, db_index=True)
    user_type = models.CharField(max_length=30, choices=USER_TYPE_CHOICES, db_index=True)
    photo = models.ImageField(upload_to="accounts/photos/", blank=True)
    institution = models.ForeignKey(
        "common.Institution", null=True, blank=True, on_delete=models.PROTECT, related_name="users"
    )
    branch = models.ForeignKey("common.Branch", null=True, blank=True, on_delete=models.PROTECT, related_name="users")

    objects = UserManager()

    REQUIRED_FIELDS = ["email"]

    class Meta:
        ordering = ["username"]
        indexes = [
            models.Index(fields=["user_type", "is_active"]),
            models.Index(fields=["institution", "branch"]),
        ]


class UserProfile(UUIDModel, TimeStampedModel, ActiveStatusModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    national_id = models.CharField(max_length=50, blank=True)
    emergency_contact = models.CharField(max_length=30, blank=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class LoginHistory(UUIDModel, TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="login_history")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    was_successful = models.BooleanField(default=True)


class PasswordResetRequest(UUIDModel, TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_requests")
    token_hash = models.CharField(max_length=128, db_index=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)


class UserSession(UUIDModel, TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tracked_sessions")
    session_key = models.CharField(max_length=80, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)


class UserDevice(UUIDModel, TimeStampedModel, ActiveStatusModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="devices")
    name = models.CharField(max_length=100)
    fingerprint = models.CharField(max_length=128, db_index=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)


class AccountVerification(UUIDModel, TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verifications")
    verification_type = models.CharField(max_length=30)
    token_hash = models.CharField(max_length=128, db_index=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

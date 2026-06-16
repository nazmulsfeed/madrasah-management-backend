from django.conf import settings
from django.db import models

from apps.common.models import (
    ActiveStatusModel,
    AuditModel,
    InstitutionScopedModel,
    SoftDeleteModel,
    TimeStampedModel,
    UUIDModel,
)


class Guardian(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel, SoftDeleteModel):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = ((STATUS_ACTIVE, "Active"), (STATUS_INACTIVE, "Inactive"))

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="guardian")
    guardian_id = models.CharField(max_length=50, unique=True)
    occupation = models.CharField(max_length=150, blank=True)
    national_id = models.CharField(max_length=50, blank=True)
    relationship_label = models.CharField(max_length=50, blank=True)
    photo = models.ImageField(upload_to="guardians/photos/", blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)

    class Meta:
        ordering = ["guardian_id"]

    def __str__(self):
        return f"{self.guardian_id} - {self.user.get_full_name() or self.user.username}"


class StudentGuardian(UUIDModel, TimeStampedModel):
    RELATION_FATHER = "father"
    RELATION_MOTHER = "mother"
    RELATION_BROTHER = "brother"
    RELATION_SISTER = "sister"
    RELATION_OTHER = "other"
    RELATION_CHOICES = (
        (RELATION_FATHER, "Father"),
        (RELATION_MOTHER, "Mother"),
        (RELATION_BROTHER, "Brother"),
        (RELATION_SISTER, "Sister"),
        (RELATION_OTHER, "Other"),
    )

    student = models.ForeignKey("students.Student", on_delete=models.CASCADE, related_name="student_guardians")
    guardian = models.ForeignKey(Guardian, on_delete=models.CASCADE, related_name="student_guardians")
    relationship = models.CharField(max_length=20, choices=RELATION_CHOICES)
    is_primary = models.BooleanField(default=False, db_index=True)
    can_pickup = models.BooleanField(default=False)
    receives_sms = models.BooleanField(default=True)
    receives_email = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_primary", "relationship"]
        constraints = [models.UniqueConstraint(fields=["student", "guardian"], name="unique_student_guardian")]

    def __str__(self):
        return f"{self.student} - {self.guardian}"


class GuardianContactPreference(UUIDModel, TimeStampedModel):
    guardian = models.OneToOneField(Guardian, on_delete=models.CASCADE, related_name="contact_preference")
    allow_sms = models.BooleanField(default=True)
    allow_email = models.BooleanField(default=True)
    allow_push = models.BooleanField(default=True)
    preferred_language = models.CharField(max_length=20, default="en")
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)

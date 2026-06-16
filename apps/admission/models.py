from django.conf import settings
from django.db import models

from apps.common.models import AuditModel, InstitutionScopedModel, SoftDeleteModel, TimeStampedModel, UUIDModel


class AdmissionApplicant(UUIDModel, TimeStampedModel):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    previous_institution = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()


class AdmissionApplication(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel, SoftDeleteModel):
    STATUS_DRAFT = "draft"
    STATUS_SUBMITTED = "submitted"
    STATUS_UNDER_REVIEW = "under_review"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_ENROLLED = "enrolled"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_UNDER_REVIEW, "Under Review"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_ENROLLED, "Enrolled"),
    )

    applicant = models.ForeignKey(AdmissionApplicant, on_delete=models.PROTECT, related_name="applications")
    application_number = models.CharField(max_length=50, unique=True)
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="admission_applications")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="admission_applications")
    department = models.ForeignKey("academics.Department", null=True, blank=True, on_delete=models.PROTECT, related_name="admission_applications")
    guardian_name = models.CharField(max_length=150)
    guardian_phone = models.CharField(max_length=30)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_SUBMITTED, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_admissions")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["institution", "branch", "status"])]

    def __str__(self):
        return self.application_number


class AdmissionTracking(UUIDModel, TimeStampedModel):
    application = models.ForeignKey(AdmissionApplication, on_delete=models.CASCADE, related_name="tracking_events")
    status = models.CharField(max_length=30)
    note = models.TextField(blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)


class AdmissionDecision(UUIDModel, TimeStampedModel):
    DECISION_APPROVED = "approved"
    DECISION_REJECTED = "rejected"
    DECISION_CHOICES = ((DECISION_APPROVED, "Approved"), (DECISION_REJECTED, "Rejected"))

    application = models.OneToOneField(AdmissionApplication, on_delete=models.CASCADE, related_name="decision")
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES)
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    remarks = models.TextField(blank=True)


class AdmissionEnrollment(UUIDModel, TimeStampedModel):
    application = models.OneToOneField(AdmissionApplication, on_delete=models.PROTECT, related_name="enrollment")
    student = models.OneToOneField("students.Student", on_delete=models.PROTECT, related_name="admission_enrollment")
    enrolled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

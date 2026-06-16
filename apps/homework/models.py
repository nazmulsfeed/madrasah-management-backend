from django.conf import settings
from django.db import models

from apps.common.models import AuditModel, InstitutionScopedModel, TimeStampedModel, UUIDModel


class Homework(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_ARCHIVED, "Archived"),
    )

    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="homework")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="homework")
    section = models.ForeignKey("students.Section", null=True, blank=True, on_delete=models.PROTECT, related_name="homework")
    subject = models.ForeignKey("teachers.Subject", on_delete=models.PROTECT, related_name="homework")
    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="homework")
    title = models.CharField(max_length=255)
    description = models.TextField()
    due_date = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class HomeworkAttachment(UUIDModel, TimeStampedModel):
    homework = models.ForeignKey(Homework, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="homework/attachments/")
    title = models.CharField(max_length=255, blank=True)


class HomeworkSubmission(UUIDModel, TimeStampedModel):
    STATUS_SUBMITTED = "submitted"
    STATUS_REVIEWED = "reviewed"
    STATUS_LATE = "late"
    STATUS_CHOICES = (
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_REVIEWED, "Reviewed"),
        (STATUS_LATE, "Late"),
    )

    homework = models.ForeignKey(Homework, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey("students.Student", on_delete=models.PROTECT, related_name="homework_submissions")
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    text_answer = models.TextField(blank=True)
    file = models.FileField(upload_to="homework/submissions/", blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUBMITTED, db_index=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["homework", "student"], name="unique_homework_student_submission")]


class HomeworkReview(UUIDModel, TimeStampedModel):
    submission = models.OneToOneField(HomeworkSubmission, on_delete=models.CASCADE, related_name="review")
    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="homework_reviews")
    feedback = models.TextField()
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

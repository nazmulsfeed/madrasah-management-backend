from django.db import models

from apps.common.models import AuditModel, InstitutionScopedModel, TimeStampedModel, UUIDModel


class HifzEnrollment(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    student = models.OneToOneField("students.Student", on_delete=models.PROTECT, related_name="hifz_enrollment")
    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="hifz_enrollments")
    start_date = models.DateField()
    target_completion_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)


class HifzDailyProgress(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    QUALITY_EXCELLENT = "excellent"
    QUALITY_GOOD = "good"
    QUALITY_AVERAGE = "average"
    QUALITY_NEEDS_IMPROVEMENT = "needs_improvement"
    QUALITY_CHOICES = (
        (QUALITY_EXCELLENT, "Excellent"),
        (QUALITY_GOOD, "Good"),
        (QUALITY_AVERAGE, "Average"),
        (QUALITY_NEEDS_IMPROVEMENT, "Needs Improvement"),
    )

    student = models.ForeignKey("students.Student", on_delete=models.PROTECT, related_name="hifz_progress")
    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="hifz_progress")
    date = models.DateField(db_index=True)
    sabak = models.CharField(max_length=150, blank=True)
    sabki = models.CharField(max_length=150, blank=True)
    amukhta = models.CharField(max_length=150, blank=True)
    juz = models.PositiveSmallIntegerField(null=True, blank=True)
    page_from = models.PositiveSmallIntegerField(null=True, blank=True)
    page_to = models.PositiveSmallIntegerField(null=True, blank=True)
    mistakes_count = models.PositiveIntegerField(default=0)
    tajweed_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    quality = models.CharField(max_length=30, choices=QUALITY_CHOICES, default=QUALITY_GOOD)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-date"]
        constraints = [models.UniqueConstraint(fields=["student", "date"], name="unique_student_hifz_daily_progress")]


class HifzMistake(UUIDModel, TimeStampedModel):
    progress = models.ForeignKey(HifzDailyProgress, on_delete=models.CASCADE, related_name="mistakes")
    mistake_type = models.CharField(max_length=100)
    description = models.TextField()
    correction = models.TextField(blank=True)


class HifzMonthlyTracking(UUIDModel, TimeStampedModel, InstitutionScopedModel):
    student = models.ForeignKey("students.Student", on_delete=models.PROTECT, related_name="hifz_monthly_tracking")
    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="hifz_monthly_tracking")
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    total_pages = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    average_tajweed_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_mistakes = models.PositiveIntegerField(default=0)
    remarks = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "month", "year"], name="unique_hifz_monthly_tracking")]

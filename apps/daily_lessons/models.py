from django.db import models

from apps.common.models import AuditModel, InstitutionScopedModel, TimeStampedModel, UUIDModel


class DailyLessonReport(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="daily_lesson_reports")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="daily_lesson_reports")
    section = models.ForeignKey("students.Section", on_delete=models.PROTECT, related_name="daily_lesson_reports")
    subject = models.ForeignKey("teachers.Subject", on_delete=models.PROTECT, related_name="daily_lesson_reports")
    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="daily_lesson_reports")
    lesson_date = models.DateField(db_index=True)
    todays_lesson = models.TextField()
    covered_pages = models.CharField(max_length=100, blank=True)
    next_lesson = models.TextField(blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-lesson_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["class_level", "section", "subject", "teacher", "lesson_date"],
                name="unique_daily_lesson_report",
            )
        ]


class LessonReportAttachment(UUIDModel, TimeStampedModel):
    lesson_report = models.ForeignKey(DailyLessonReport, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="daily_lessons/attachments/")
    title = models.CharField(max_length=255, blank=True)

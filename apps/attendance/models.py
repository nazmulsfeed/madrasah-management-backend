from django.conf import settings
from django.db import models

from apps.common.models import AuditModel, InstitutionScopedModel, TimeStampedModel, UUIDModel


class StudentAttendanceSession(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    SESSION_MORNING = "morning"
    SESSION_AFTERNOON = "afternoon"
    SESSION_FULL_DAY = "full_day"
    SESSION_CHOICES = (
        (SESSION_MORNING, "Morning"),
        (SESSION_AFTERNOON, "Afternoon"),
        (SESSION_FULL_DAY, "Full Day"),
    )

    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="attendance_sessions")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="attendance_sessions")
    section = models.ForeignKey("students.Section", on_delete=models.PROTECT, related_name="attendance_sessions")
    date = models.DateField(db_index=True)
    session = models.CharField(max_length=20, choices=SESSION_CHOICES, default=SESSION_FULL_DAY)
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="marked_attendance_sessions")
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["class_level", "section", "date", "session"], name="unique_attendance_session")
        ]


class StudentAttendance(UUIDModel, TimeStampedModel):
    STATUS_PRESENT = "present"
    STATUS_ABSENT = "absent"
    STATUS_LATE = "late"
    STATUS_LEAVE = "leave"
    STATUS_CHOICES = (
        (STATUS_PRESENT, "Present"),
        (STATUS_ABSENT, "Absent"),
        (STATUS_LATE, "Late"),
        (STATUS_LEAVE, "Leave"),
    )

    attendance_session = models.ForeignKey(StudentAttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey("students.Student", on_delete=models.PROTECT, related_name="attendance_records")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, db_index=True)
    remarks = models.TextField(blank=True)
    guardian_visible = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["attendance_session", "student"], name="unique_student_session_attendance")]


class TeacherAttendance(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    STATUS_PRESENT = "present"
    STATUS_ABSENT = "absent"
    STATUS_LATE = "late"
    STATUS_LEAVE = "leave"
    STATUS_CHOICES = StudentAttendance.STATUS_CHOICES

    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="attendance_records")
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, db_index=True)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["teacher", "date"], name="unique_teacher_daily_attendance")]


class AttendanceDailyReport(UUIDModel, TimeStampedModel, InstitutionScopedModel):
    date = models.DateField(db_index=True)
    class_level = models.ForeignKey("students.ClassLevel", null=True, blank=True, on_delete=models.PROTECT)
    section = models.ForeignKey("students.Section", null=True, blank=True, on_delete=models.PROTECT)
    total_students = models.PositiveIntegerField(default=0)
    present_count = models.PositiveIntegerField(default=0)
    absent_count = models.PositiveIntegerField(default=0)
    late_count = models.PositiveIntegerField(default=0)
    leave_count = models.PositiveIntegerField(default=0)


class AttendanceMonthlyReport(UUIDModel, TimeStampedModel, InstitutionScopedModel):
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="monthly_attendance_reports")
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    class_level = models.ForeignKey("students.ClassLevel", null=True, blank=True, on_delete=models.PROTECT)
    section = models.ForeignKey("students.Section", null=True, blank=True, on_delete=models.PROTECT)
    total_school_days = models.PositiveIntegerField(default=0)
    average_present = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    average_absent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

from django.db import models

from apps.common.models import ActiveStatusModel, AuditModel, InstitutionScopedModel, TimeStampedModel, UUIDModel


class Department(UUIDModel, TimeStampedModel, InstitutionScopedModel, ActiveStatusModel):
    DEPARTMENT_HIFZ = "hifz"
    DEPARTMENT_NAZERA = "nazera"
    DEPARTMENT_KITAB = "kitab"
    DEPARTMENT_GENERAL = "general"
    DEPARTMENT_CHOICES = (
        (DEPARTMENT_HIFZ, "Hifz"),
        (DEPARTMENT_NAZERA, "Nazera"),
        (DEPARTMENT_KITAB, "Kitab"),
        (DEPARTMENT_GENERAL, "General"),
    )

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    department_type = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES)
    head = models.ForeignKey("teachers.Teacher", null=True, blank=True, on_delete=models.SET_NULL, related_name="headed_departments")
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["institution", "code"], name="unique_department_code_per_institution")]

    def __str__(self):
        return self.name


class AcademicSession(UUIDModel, TimeStampedModel, InstitutionScopedModel, ActiveStatusModel):
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="sessions")
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-start_date"]
        constraints = [models.UniqueConstraint(fields=["academic_year", "code"], name="unique_session_code_per_year")]

    def __str__(self):
        return f"{self.academic_year} - {self.name}"


class ClassDepartment(UUIDModel, TimeStampedModel, ActiveStatusModel):
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.CASCADE, related_name="department_links")
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="class_links")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["class_level", "department"], name="unique_class_department")]


class ClassSubject(UUIDModel, TimeStampedModel, ActiveStatusModel):
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.CASCADE, related_name="class_subjects")
    subject = models.ForeignKey("teachers.Subject", on_delete=models.PROTECT, related_name="class_subjects")
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="class_subjects")
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.PROTECT, related_name="class_subjects")
    is_core = models.BooleanField(default=True)
    weekly_periods = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["class_level__order", "subject__name"]
        constraints = [
            models.UniqueConstraint(fields=["class_level", "subject", "academic_year"], name="unique_class_subject_year")
        ]


class Room(UUIDModel, TimeStampedModel, InstitutionScopedModel, ActiveStatusModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    capacity = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["institution", "branch", "code"], name="unique_room_code_per_branch")]

    def __str__(self):
        return self.name


class Period(UUIDModel, TimeStampedModel, InstitutionScopedModel, ActiveStatusModel):
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ["order"]


class Timetable(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel, ActiveStatusModel):
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="timetables")
    session = models.ForeignKey(AcademicSession, null=True, blank=True, on_delete=models.PROTECT, related_name="timetables")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="timetables")
    section = models.ForeignKey("students.Section", on_delete=models.PROTECT, related_name="timetables")
    name = models.CharField(max_length=150)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["academic_year", "class_level", "section", "name"], name="unique_timetable_name")
        ]


class TimetableSlot(UUIDModel, TimeStampedModel, ActiveStatusModel):
    DAY_CHOICES = (
        ("saturday", "Saturday"),
        ("sunday", "Sunday"),
        ("monday", "Monday"),
        ("tuesday", "Tuesday"),
        ("wednesday", "Wednesday"),
        ("thursday", "Thursday"),
        ("friday", "Friday"),
    )

    timetable = models.ForeignKey(Timetable, on_delete=models.CASCADE, related_name="slots")
    day_of_week = models.CharField(max_length=20, choices=DAY_CHOICES)
    period = models.ForeignKey(Period, on_delete=models.PROTECT, related_name="timetable_slots")
    subject = models.ForeignKey("teachers.Subject", on_delete=models.PROTECT, related_name="timetable_slots")
    teacher = models.ForeignKey("teachers.Teacher", on_delete=models.PROTECT, related_name="timetable_slots")
    room = models.ForeignKey(Room, null=True, blank=True, on_delete=models.SET_NULL, related_name="timetable_slots")

    class Meta:
        ordering = ["day_of_week", "period__order"]
        constraints = [models.UniqueConstraint(fields=["timetable", "day_of_week", "period"], name="unique_timetable_period")]

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


class Subject(UUIDModel, TimeStampedModel, InstitutionScopedModel, ActiveStatusModel):
    TYPE_GENERAL = "general"
    TYPE_HIFZ = "hifz"
    TYPE_ARABIC = "arabic"
    TYPE_CHOICES = ((TYPE_GENERAL, "General"), (TYPE_HIFZ, "Hifz"), (TYPE_ARABIC, "Arabic"))

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    subject_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_GENERAL)
    is_hifz_subject = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["institution", "code"], name="unique_subject_code_per_institution")]

    def __str__(self):
        return self.name


class Teacher(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel, SoftDeleteModel):
    TYPE_GENERAL = "teacher"
    TYPE_HIFZ = "hifz_teacher"
    TYPE_CHOICES = ((TYPE_GENERAL, "Teacher"), (TYPE_HIFZ, "Hifz Teacher"))
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_ON_LEAVE = "on_leave"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_ON_LEAVE, "On Leave"),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="teacher")
    employee_id = models.CharField(max_length=50, unique=True)
    teacher_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_GENERAL)
    joining_date = models.DateField()
    qualification = models.TextField(blank=True)
    specialization = models.CharField(max_length=150, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)

    class Meta:
        ordering = ["employee_id"]
        indexes = [models.Index(fields=["institution", "branch", "teacher_type", "status"])]

    def __str__(self):
        return f"{self.employee_id} - {self.user.get_full_name() or self.user.username}"


class TeacherProfile(UUIDModel, TimeStampedModel):
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name="profile")
    biography = models.TextField(blank=True)
    experience_years = models.PositiveIntegerField(default=0)
    emergency_contact = models.CharField(max_length=30, blank=True)


class TeacherEmployment(UUIDModel, TimeStampedModel):
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name="employment")
    designation = models.CharField(max_length=100)
    department = models.CharField(max_length=100, blank=True)
    employment_type = models.CharField(max_length=50, blank=True)
    salary_grade = models.CharField(max_length=50, blank=True)


class TeacherSubjectAssignment(UUIDModel, TimeStampedModel, ActiveStatusModel):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="subject_assignments")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="teacher_assignments")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="teacher_subjects")
    section = models.ForeignKey("students.Section", null=True, blank=True, on_delete=models.PROTECT, related_name="teacher_subjects")
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="teacher_subjects")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "subject", "class_level", "section", "academic_year"],
                name="unique_teacher_subject_assignment",
            )
        ]


class TeacherClassAssignment(UUIDModel, TimeStampedModel, ActiveStatusModel):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="class_assignments")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="teacher_classes")
    section = models.ForeignKey("students.Section", on_delete=models.PROTECT, related_name="teacher_classes")
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="teacher_classes")
    is_class_teacher = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "class_level", "section", "academic_year"], name="unique_teacher_class_assignment"
            )
        ]


class TeacherDocument(UUIDModel, TimeStampedModel):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50)
    file = models.FileField(upload_to="teachers/documents/")
    verified_at = models.DateTimeField(null=True, blank=True)

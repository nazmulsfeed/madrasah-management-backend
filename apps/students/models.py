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


class ClassLevel(UUIDModel, TimeStampedModel, InstitutionScopedModel, ActiveStatusModel):
    EDUCATION_GENERAL = "general"
    EDUCATION_HIFZ = "hifz"
    EDUCATION_CHOICES = ((EDUCATION_GENERAL, "General"), (EDUCATION_HIFZ, "Hifz"))

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    order = models.PositiveIntegerField(default=0)
    education_stream = models.CharField(max_length=20, choices=EDUCATION_CHOICES, default=EDUCATION_GENERAL)

    class Meta:
        ordering = ["order", "name"]
        constraints = [models.UniqueConstraint(fields=["institution", "code"], name="unique_class_code_per_institution")]

    def __str__(self):
        return self.name


class Section(UUIDModel, TimeStampedModel, InstitutionScopedModel, ActiveStatusModel):
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name="sections")
    name = models.CharField(max_length=50)
    capacity = models.PositiveIntegerField(default=0)
    class_teacher = models.ForeignKey(
        "teachers.Teacher", null=True, blank=True, on_delete=models.SET_NULL, related_name="class_sections"
    )

    class Meta:
        ordering = ["class_level__order", "name"]
        constraints = [models.UniqueConstraint(fields=["class_level", "name"], name="unique_section_per_class")]

    def __str__(self):
        return f"{self.class_level} - {self.name}"


class Student(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel, SoftDeleteModel):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_GRADUATED = "graduated"
    STATUS_TRANSFERRED = "transferred"
    STATUS_SUSPENDED = "suspended"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_GRADUATED, "Graduated"),
        (STATUS_TRANSFERRED, "Transferred"),
        (STATUS_SUSPENDED, "Suspended"),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="student")
    admission_number = models.CharField(max_length=50, unique=True)
    student_id = models.CharField(max_length=50, unique=True)
    current_enrollment = models.ForeignKey(
        "students.StudentEnrollment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_students",
    )
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    photo = models.ImageField(upload_to="students/photos/", blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)
    admission_date = models.DateField()
    admission_source = models.CharField(max_length=100, blank=True)
    previous_institution = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["admission_number"]
        indexes = [
            models.Index(fields=["institution", "branch", "status"]),
            models.Index(fields=["admission_number"]),
            models.Index(fields=["student_id"]),
        ]

    def __str__(self):
        return f"{self.admission_number} - {self.user.get_full_name() or self.user.username}"


class StudentProfile(UUIDModel, TimeStampedModel):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name="profile")
    birth_certificate_number = models.CharField(max_length=100, blank=True)
    nationality = models.CharField(max_length=100, default="Bangladeshi")
    religion = models.CharField(max_length=100, default="Islam")
    medical_notes = models.TextField(blank=True)
    special_needs = models.TextField(blank=True)


class StudentEnrollment(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_PROMOTED = "promoted"
    STATUS_TRANSFERRED = "transferred"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_PROMOTED, "Promoted"),
        (STATUS_TRANSFERRED, "Transferred"),
    )

    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="enrollments")
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="student_enrollments")
    class_level = models.ForeignKey(ClassLevel, on_delete=models.PROTECT, related_name="student_enrollments")
    section = models.ForeignKey(Section, on_delete=models.PROTECT, related_name="student_enrollments")
    roll_number = models.CharField(max_length=30)
    enrollment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["class_level__order", "section__name", "roll_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["academic_year", "class_level", "section", "roll_number"],
                name="unique_roll_per_class_section_year",
            ),
            models.UniqueConstraint(fields=["student", "academic_year"], name="unique_student_per_academic_year"),
        ]


class StudentClassHistory(UUIDModel, TimeStampedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="class_history")
    from_enrollment = models.ForeignKey(StudentEnrollment, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    to_enrollment = models.ForeignKey(StudentEnrollment, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    action = models.CharField(max_length=30)
    remarks = models.TextField(blank=True)


class StudentStatusHistory(UUIDModel, TimeStampedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="status_history")
    previous_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    reason = models.TextField(blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)


class StudentDocument(UUIDModel, TimeStampedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50)
    file = models.FileField(upload_to="students/documents/")
    verified_at = models.DateTimeField(null=True, blank=True)


class StudentMedicalInfo(UUIDModel, TimeStampedModel):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name="medical_info")
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    emergency_instructions = models.TextField(blank=True)


class StudentPreviousEducation(UUIDModel, TimeStampedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="previous_education")
    institution_name = models.CharField(max_length=255)
    class_name = models.CharField(max_length=100, blank=True)
    passing_year = models.PositiveIntegerField(null=True, blank=True)
    result = models.CharField(max_length=100, blank=True)

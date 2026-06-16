from django.conf import settings
from django.db import models

from apps.common.models import AuditModel, InstitutionScopedModel, TimeStampedModel, UUIDModel


class ExamTerm(UUIDModel, TimeStampedModel, InstitutionScopedModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="exam_terms")
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=100)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["academic_year", "code"], name="unique_exam_term_code")]

    def __str__(self):
        return self.name


class Exam(UUIDModel, TimeStampedModel, InstitutionScopedModel, AuditModel):
    STATUS_DRAFT = "draft"
    STATUS_ACTIVE = "active"
    STATUS_LOCKED = "locked"
    STATUS_PUBLISHED = "published"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_LOCKED, "Locked"),
        (STATUS_PUBLISHED, "Published"),
    )

    name = models.CharField(max_length=150)
    academic_year = models.ForeignKey("common.AcademicYear", on_delete=models.PROTECT, related_name="exams")
    exam_term = models.ForeignKey(ExamTerm, on_delete=models.PROTECT, related_name="exams")
    class_level = models.ForeignKey("students.ClassLevel", on_delete=models.PROTECT, related_name="exams")
    section = models.ForeignKey("students.Section", null=True, blank=True, on_delete=models.PROTECT, related_name="exams")
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="published_exams")

    class Meta:
        ordering = ["-start_date"]


class ExamSubject(UUIDModel, TimeStampedModel):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="exam_subjects")
    subject = models.ForeignKey("teachers.Subject", on_delete=models.PROTECT, related_name="exam_subjects")
    total_marks = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    pass_marks = models.DecimalField(max_digits=6, decimal_places=2, default=33)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["exam", "subject"], name="unique_exam_subject")]


class ExamSchedule(UUIDModel, TimeStampedModel):
    exam_subject = models.OneToOneField(ExamSubject, on_delete=models.CASCADE, related_name="schedule")
    exam_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.ForeignKey("academics.Room", null=True, blank=True, on_delete=models.SET_NULL)


class GradeScale(UUIDModel, TimeStampedModel, InstitutionScopedModel):
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)


class GradeRule(UUIDModel, TimeStampedModel):
    grade_scale = models.ForeignKey(GradeScale, on_delete=models.CASCADE, related_name="rules")
    grade = models.CharField(max_length=10)
    gpa = models.DecimalField(max_digits=4, decimal_places=2)
    min_marks = models.DecimalField(max_digits=6, decimal_places=2)
    max_marks = models.DecimalField(max_digits=6, decimal_places=2)
    remarks = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-min_marks"]


class MarkEntry(UUIDModel, TimeStampedModel, AuditModel):
    STATUS_DRAFT = "draft"
    STATUS_SUBMITTED = "submitted"
    STATUS_APPROVED = "approved"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Draft"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_APPROVED, "Approved"),
    )

    exam = models.ForeignKey(Exam, on_delete=models.PROTECT, related_name="marks")
    student = models.ForeignKey("students.Student", on_delete=models.PROTECT, related_name="exam_marks")
    subject = models.ForeignKey("teachers.Subject", on_delete=models.PROTECT, related_name="exam_marks")
    written_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    practical_marks = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_marks = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    grade = models.CharField(max_length=10, blank=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    remarks = models.TextField(blank=True)
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="entered_marks")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_marks")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["exam", "student", "subject"], name="unique_exam_student_subject_mark")]


class Result(UUIDModel, TimeStampedModel):
    exam = models.ForeignKey(Exam, on_delete=models.PROTECT, related_name="results")
    student = models.ForeignKey("students.Student", on_delete=models.PROTECT, related_name="results")
    total_marks = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    obtained_marks = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    final_grade = models.CharField(max_length=10, blank=True)
    merit_position = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["merit_position", "student__admission_number"]
        constraints = [models.UniqueConstraint(fields=["exam", "student"], name="unique_exam_student_result")]


class ResultSubject(UUIDModel, TimeStampedModel):
    result = models.ForeignKey(Result, on_delete=models.CASCADE, related_name="subjects")
    subject = models.ForeignKey("teachers.Subject", on_delete=models.PROTECT)
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2)
    total_marks = models.DecimalField(max_digits=6, decimal_places=2)
    grade = models.CharField(max_length=10)
    gpa = models.DecimalField(max_digits=4, decimal_places=2)


class Transcript(UUIDModel, TimeStampedModel):
    result = models.OneToOneField(Result, on_delete=models.CASCADE, related_name="transcript")
    pdf_file = models.FileField(upload_to="exams/marksheets/", blank=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

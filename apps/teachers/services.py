from django.db import transaction

from .models import TeacherClassAssignment, TeacherSubjectAssignment


class TeacherAssignmentService:
    @staticmethod
    @transaction.atomic
    def assign_class(teacher, class_level, section, academic_year, is_class_teacher=False):
        assignment, _ = TeacherClassAssignment.objects.update_or_create(
            teacher=teacher,
            class_level=class_level,
            section=section,
            academic_year=academic_year,
            defaults={"is_class_teacher": is_class_teacher, "is_active": True},
        )
        return assignment

    @staticmethod
    @transaction.atomic
    def assign_subject(teacher, subject, class_level, section, academic_year):
        assignment, _ = TeacherSubjectAssignment.objects.update_or_create(
            teacher=teacher,
            subject=subject,
            class_level=class_level,
            section=section,
            academic_year=academic_year,
            defaults={"is_active": True},
        )
        return assignment


class TeacherWorkloadService:
    @staticmethod
    def summary(teacher):
        return {
            "class_assignments": teacher.class_assignments.filter(is_active=True).count(),
            "subject_assignments": teacher.subject_assignments.filter(is_active=True).count(),
        }


class TeacherStatusService:
    @staticmethod
    def change_status(teacher, status, actor=None):
        teacher.status = status
        teacher.updated_by = actor
        teacher.save(update_fields=["status", "updated_by", "updated_at"])
        return teacher

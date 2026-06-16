from django.db import transaction

from .models import StudentClassHistory, StudentEnrollment, StudentStatusHistory


class StudentEnrollmentService:
    @staticmethod
    @transaction.atomic
    def enroll(student, academic_year, class_level, section, roll_number, start_date, actor=None):
        enrollment = StudentEnrollment.objects.create(
            institution=student.institution,
            branch=student.branch,
            student=student,
            academic_year=academic_year,
            class_level=class_level,
            section=section,
            roll_number=roll_number,
            start_date=start_date,
            created_by=actor,
            updated_by=actor,
        )
        student.current_enrollment = enrollment
        student.save(update_fields=["current_enrollment", "updated_at"])
        return enrollment


class StudentPromotionService:
    @staticmethod
    @transaction.atomic
    def promote(student, academic_year, class_level, section, roll_number, start_date, actor=None, remarks=""):
        previous = student.current_enrollment
        if previous:
            previous.enrollment_status = StudentEnrollment.STATUS_PROMOTED
            previous.end_date = start_date
            previous.updated_by = actor
            previous.save(update_fields=["enrollment_status", "end_date", "updated_by", "updated_at"])
        enrollment = StudentEnrollmentService.enroll(
            student=student,
            academic_year=academic_year,
            class_level=class_level,
            section=section,
            roll_number=roll_number,
            start_date=start_date,
            actor=actor,
        )
        StudentClassHistory.objects.create(
            student=student,
            from_enrollment=previous,
            to_enrollment=enrollment,
            action="promotion",
            remarks=remarks,
        )
        return enrollment


class StudentStatusService:
    @staticmethod
    @transaction.atomic
    def change_status(student, new_status, actor=None, reason=""):
        previous_status = student.status
        student.status = new_status
        student.updated_by = actor
        student.save(update_fields=["status", "updated_by", "updated_at"])
        StudentStatusHistory.objects.create(
            student=student,
            previous_status=previous_status,
            new_status=new_status,
            reason=reason,
            changed_by=actor,
        )
        return student


class StudentAdmissionConversionService:
    """Admission conversion hook reserved for the admission app integration."""


class StudentTransferService:
    """Transfer workflow hook reserved for future branch-to-branch movement."""

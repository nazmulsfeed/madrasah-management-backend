from django.db import transaction

from .models import AttendanceDailyReport, AttendanceMonthlyReport, StudentAttendance, StudentAttendanceSession


class StudentAttendanceMarkingService:
    @staticmethod
    @transaction.atomic
    def mark(session, student, status, remarks=""):
        record, _ = StudentAttendance.objects.update_or_create(
            attendance_session=session,
            student=student,
            defaults={"status": status, "remarks": remarks},
        )
        return record


class AttendanceReportService:
    @staticmethod
    @transaction.atomic
    def generate_daily(session):
        records = session.records.all()
        counts = {
            "total_students": records.count(),
            "present_count": records.filter(status=StudentAttendance.STATUS_PRESENT).count(),
            "absent_count": records.filter(status=StudentAttendance.STATUS_ABSENT).count(),
            "late_count": records.filter(status=StudentAttendance.STATUS_LATE).count(),
            "leave_count": records.filter(status=StudentAttendance.STATUS_LEAVE).count(),
        }
        report, _ = AttendanceDailyReport.objects.update_or_create(
            institution=session.institution,
            branch=session.branch,
            date=session.date,
            class_level=session.class_level,
            section=session.section,
            defaults=counts,
        )
        return report

    @staticmethod
    @transaction.atomic
    def generate_monthly(institution, branch, academic_year, month, year, class_level=None, section=None):
        daily = AttendanceDailyReport.objects.filter(institution=institution, branch=branch, date__month=month, date__year=year)
        if class_level:
            daily = daily.filter(class_level=class_level)
        if section:
            daily = daily.filter(section=section)
        total_days = daily.count()
        present = sum(item.present_count for item in daily)
        absent = sum(item.absent_count for item in daily)
        report, _ = AttendanceMonthlyReport.objects.update_or_create(
            institution=institution,
            branch=branch,
            academic_year=academic_year,
            month=month,
            year=year,
            class_level=class_level,
            section=section,
            defaults={
                "total_school_days": total_days,
                "average_present": present / total_days if total_days else 0,
                "average_absent": absent / total_days if total_days else 0,
            },
        )
        return report

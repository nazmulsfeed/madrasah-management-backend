from io import BytesIO

from django.db import transaction
from django.utils import timezone

from .models import GradeRule, MarkEntry, Result, ResultSubject


class ResultCalculationService:
    @staticmethod
    def grade_for_marks(grade_scale, marks):
        return (
            GradeRule.objects.filter(grade_scale=grade_scale, min_marks__lte=marks, max_marks__gte=marks)
            .order_by("-min_marks")
            .first()
        )

    @staticmethod
    @transaction.atomic
    def calculate_exam_results(exam, grade_scale=None):
        students = exam.marks.values_list("student", flat=True).distinct()
        results = []
        for student_id in students:
            marks = list(exam.marks.filter(student_id=student_id))
            total_marks = sum(mark.total_marks for mark in marks)
            obtained = sum(mark.marks_obtained for mark in marks)
            percentage = (obtained / total_marks * 100) if total_marks else 0
            grade_rule = ResultCalculationService.grade_for_marks(grade_scale, percentage) if grade_scale else None
            result, _ = Result.objects.update_or_create(
                exam=exam,
                student_id=student_id,
                defaults={
                    "total_marks": total_marks,
                    "obtained_marks": obtained,
                    "gpa": grade_rule.gpa if grade_rule else 0,
                    "final_grade": grade_rule.grade if grade_rule else "",
                },
            )
            result.subjects.all().delete()
            for mark in marks:
                subject_percentage = (mark.marks_obtained / mark.total_marks * 100) if mark.total_marks else 0
                rule = ResultCalculationService.grade_for_marks(grade_scale, subject_percentage) if grade_scale else None
                ResultSubject.objects.create(
                    result=result,
                    subject=mark.subject,
                    marks_obtained=mark.marks_obtained,
                    total_marks=mark.total_marks,
                    grade=rule.grade if rule else mark.grade,
                    gpa=rule.gpa if rule else mark.gpa,
                )
            results.append(result)
        ResultPublishService.assign_merit_positions(exam)
        return results


class MarkEntryService:
    @staticmethod
    @transaction.atomic
    def submit(mark_entry, actor=None):
        mark_entry.status = MarkEntry.STATUS_SUBMITTED
        mark_entry.entered_by = actor
        mark_entry.save(update_fields=["status", "entered_by", "updated_at"])
        return mark_entry


class ResultPublishService:
    @staticmethod
    @transaction.atomic
    def assign_merit_positions(exam):
        results = exam.results.order_by("-obtained_marks", "-gpa", "student__admission_number")
        for position, result in enumerate(results, start=1):
            result.merit_position = position
            result.save(update_fields=["merit_position", "updated_at"])

    @staticmethod
    @transaction.atomic
    def publish(exam, actor=None):
        exam.status = exam.STATUS_PUBLISHED
        exam.published_at = timezone.now()
        exam.published_by = actor
        exam.save(update_fields=["status", "published_at", "published_by", "updated_at"])
        exam.results.update(is_published=True, published_at=exam.published_at)
        return exam


class MarksheetPDFService:
    @staticmethod
    def build_pdf(result):
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.drawString(72, 800, "Madrasah Marksheet")
        pdf.drawString(72, 775, f"Student: {result.student}")
        pdf.drawString(72, 755, f"Exam: {result.exam.name}")
        pdf.drawString(72, 735, f"Total: {result.obtained_marks}/{result.total_marks}")
        pdf.drawString(72, 715, f"GPA: {result.gpa}  Grade: {result.final_grade}  Merit: {result.merit_position or ''}")
        y = 680
        for subject in result.subjects.select_related("subject"):
            pdf.drawString(72, y, f"{subject.subject.name}: {subject.marks_obtained}/{subject.total_marks} {subject.grade}")
            y -= 20
        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        return buffer

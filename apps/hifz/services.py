from django.db import transaction

from .models import HifzDailyProgress, HifzMonthlyTracking


class HifzProgressRecordingService:
    @staticmethod
    @transaction.atomic
    def record(**data):
        progress, _ = HifzDailyProgress.objects.update_or_create(
            student=data["student"],
            date=data["date"],
            defaults=data,
        )
        return progress


class HifzReportService:
    @staticmethod
    @transaction.atomic
    def generate_monthly(student, teacher, institution, branch, month, year):
        records = HifzDailyProgress.objects.filter(student=student, date__month=month, date__year=year)
        count = records.count()
        total_pages = sum(((item.page_to or 0) - (item.page_from or 0) + 1) for item in records if item.page_from and item.page_to)
        total_mistakes = sum(item.mistakes_count for item in records)
        tajweed_total = sum(item.tajweed_score for item in records)
        report, _ = HifzMonthlyTracking.objects.update_or_create(
            institution=institution,
            branch=branch,
            student=student,
            month=month,
            year=year,
            defaults={
                "teacher": teacher,
                "total_pages": total_pages,
                "average_tajweed_score": tajweed_total / count if count else 0,
                "total_mistakes": total_mistakes,
            },
        )
        return report

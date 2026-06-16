from django.db import transaction
from django.utils import timezone

from .models import Homework, HomeworkReview, HomeworkSubmission


class HomeworkAssignmentService:
    @staticmethod
    def publish(homework):
        homework.status = Homework.STATUS_PUBLISHED
        homework.published_at = timezone.now()
        homework.save(update_fields=["status", "published_at", "updated_at"])
        return homework


class HomeworkSubmissionService:
    @staticmethod
    @transaction.atomic
    def submit(homework, student, submitted_by=None, text_answer="", file=None):
        submission, _ = HomeworkSubmission.objects.update_or_create(
            homework=homework,
            student=student,
            defaults={"submitted_by": submitted_by, "text_answer": text_answer, "file": file or ""},
        )
        return submission


class HomeworkReviewService:
    @staticmethod
    @transaction.atomic
    def review(submission, teacher, feedback, score=None, reviewed_by=None):
        review, _ = HomeworkReview.objects.update_or_create(
            submission=submission,
            defaults={"teacher": teacher, "feedback": feedback, "score": score, "reviewed_by": reviewed_by},
        )
        submission.status = HomeworkSubmission.STATUS_REVIEWED
        submission.save(update_fields=["status", "updated_at"])
        return review

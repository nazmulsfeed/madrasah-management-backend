from django.db import transaction
from django.utils import timezone

from .models import AdmissionDecision, AdmissionTracking


class AdmissionReviewService:
    @staticmethod
    @transaction.atomic
    def approve(application, actor=None, remarks=""):
        application.status = application.STATUS_APPROVED
        application.reviewed_by = actor
        application.reviewed_at = timezone.now()
        application.rejection_reason = ""
        application.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason", "updated_at"])
        AdmissionDecision.objects.update_or_create(
            application=application,
            defaults={"decision": AdmissionDecision.DECISION_APPROVED, "decided_by": actor, "remarks": remarks},
        )
        AdmissionTracking.objects.create(application=application, status=application.status, note=remarks, actor=actor)
        return application

    @staticmethod
    @transaction.atomic
    def reject(application, actor=None, reason=""):
        application.status = application.STATUS_REJECTED
        application.reviewed_by = actor
        application.reviewed_at = timezone.now()
        application.rejection_reason = reason
        application.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason", "updated_at"])
        AdmissionDecision.objects.update_or_create(
            application=application,
            defaults={"decision": AdmissionDecision.DECISION_REJECTED, "decided_by": actor, "remarks": reason},
        )
        AdmissionTracking.objects.create(application=application, status=application.status, note=reason, actor=actor)
        return application


class AdmissionTrackingService:
    @staticmethod
    def add_event(application, status, note="", actor=None):
        return AdmissionTracking.objects.create(application=application, status=status, note=note, actor=actor)

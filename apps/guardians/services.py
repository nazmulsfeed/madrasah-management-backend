from django.db import transaction

from .models import GuardianContactPreference, StudentGuardian


class GuardianLinkingService:
    @staticmethod
    @transaction.atomic
    def link(student, guardian, relationship, is_primary=False, can_pickup=False):
        link, _ = StudentGuardian.objects.update_or_create(
            student=student,
            guardian=guardian,
            defaults={
                "relationship": relationship,
                "is_primary": is_primary,
                "can_pickup": can_pickup,
            },
        )
        if is_primary:
            StudentGuardian.objects.filter(student=student).exclude(id=link.id).update(is_primary=False)
        return link


class GuardianNotificationPreferenceService:
    @staticmethod
    def update(guardian, **preferences):
        preference, _ = GuardianContactPreference.objects.get_or_create(guardian=guardian)
        for field, value in preferences.items():
            setattr(preference, field, value)
        preference.save()
        return preference

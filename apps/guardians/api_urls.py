from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GuardianContactPreferenceViewSet, GuardianViewSet, StudentGuardianViewSet

router = DefaultRouter()
router.register("guardians", GuardianViewSet, basename="guardians")
router.register("student-guardians", StudentGuardianViewSet, basename="student-guardians")
router.register("contact-preferences", GuardianContactPreferenceViewSet, basename="guardian-contact-preferences")

urlpatterns = [path("", include(router.urls))]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdmissionApplicantViewSet,
    AdmissionApplicationViewSet,
    AdmissionDecisionViewSet,
    AdmissionEnrollmentViewSet,
    AdmissionTrackingViewSet,
)

router = DefaultRouter()
router.register("applicants", AdmissionApplicantViewSet)
router.register("applications", AdmissionApplicationViewSet)
router.register("tracking", AdmissionTrackingViewSet)
router.register("decisions", AdmissionDecisionViewSet)
router.register("enrollments", AdmissionEnrollmentViewSet)

urlpatterns = [path("", include(router.urls))]

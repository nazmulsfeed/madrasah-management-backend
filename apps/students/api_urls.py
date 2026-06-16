from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClassLevelViewSet, SectionViewSet, StudentEnrollmentViewSet, StudentViewSet

router = DefaultRouter()
router.register("students", StudentViewSet, basename="students")
router.register("class-levels", ClassLevelViewSet)
router.register("sections", SectionViewSet)
router.register("enrollments", StudentEnrollmentViewSet, basename="student-enrollments")

urlpatterns = [path("", include(router.urls))]

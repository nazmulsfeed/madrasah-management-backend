from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceDailyReportViewSet,
    AttendanceMonthlyReportViewSet,
    StudentAttendanceSessionViewSet,
    StudentAttendanceViewSet,
    TeacherAttendanceViewSet,
)

router = DefaultRouter()
router.register("student-sessions", StudentAttendanceSessionViewSet)
router.register("student-attendance", StudentAttendanceViewSet)
router.register("teacher-attendance", TeacherAttendanceViewSet)
router.register("daily-reports", AttendanceDailyReportViewSet)
router.register("monthly-reports", AttendanceMonthlyReportViewSet)

urlpatterns = [path("", include(router.urls))]

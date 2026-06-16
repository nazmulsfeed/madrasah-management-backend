from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HifzDailyProgressViewSet, HifzEnrollmentViewSet, HifzMistakeViewSet, HifzMonthlyTrackingViewSet

router = DefaultRouter()
router.register("enrollments", HifzEnrollmentViewSet)
router.register("daily-progress", HifzDailyProgressViewSet)
router.register("mistakes", HifzMistakeViewSet)
router.register("monthly-tracking", HifzMonthlyTrackingViewSet)

urlpatterns = [path("", include(router.urls))]

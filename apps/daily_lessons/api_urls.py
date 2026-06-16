from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DailyLessonReportViewSet, LessonReportAttachmentViewSet

router = DefaultRouter()
router.register("reports", DailyLessonReportViewSet)
router.register("attachments", LessonReportAttachmentViewSet)

urlpatterns = [path("", include(router.urls))]

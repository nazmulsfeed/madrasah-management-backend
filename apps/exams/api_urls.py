from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ExamScheduleViewSet,
    ExamSubjectViewSet,
    ExamTermViewSet,
    ExamViewSet,
    GradeRuleViewSet,
    GradeScaleViewSet,
    MarkEntryViewSet,
    ResultViewSet,
    TranscriptViewSet,
)

router = DefaultRouter()
router.register("terms", ExamTermViewSet)
router.register("exams", ExamViewSet)
router.register("subjects", ExamSubjectViewSet)
router.register("schedules", ExamScheduleViewSet)
router.register("grade-scales", GradeScaleViewSet)
router.register("grade-rules", GradeRuleViewSet)
router.register("marks", MarkEntryViewSet)
router.register("results", ResultViewSet)
router.register("transcripts", TranscriptViewSet)

urlpatterns = [path("", include(router.urls))]

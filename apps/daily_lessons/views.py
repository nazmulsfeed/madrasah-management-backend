from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import DailyLessonReport, LessonReportAttachment
from .serializers import DailyLessonReportSerializer, LessonReportAttachmentSerializer


class DailyLessonsDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "daily_lessons/dashboard.html"


class DailyLessonReportViewSet(ModelViewSet):
    queryset = DailyLessonReport.objects.select_related("academic_year", "class_level", "section", "subject", "teacher")
    serializer_class = DailyLessonReportSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["teacher", "class_level", "section", "subject", "lesson_date"]


class LessonReportAttachmentViewSet(ModelViewSet):
    queryset = LessonReportAttachment.objects.select_related("lesson_report")
    serializer_class = LessonReportAttachmentSerializer
    permission_classes = [IsAuthenticated]

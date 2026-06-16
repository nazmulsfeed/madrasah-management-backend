from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import HifzDailyProgress, HifzEnrollment, HifzMistake, HifzMonthlyTracking
from .serializers import HifzDailyProgressSerializer, HifzEnrollmentSerializer, HifzMistakeSerializer, HifzMonthlyTrackingSerializer


class HifzDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "hifz/dashboard.html"


class HifzEnrollmentViewSet(ModelViewSet):
    queryset = HifzEnrollment.objects.select_related("student", "teacher")
    serializer_class = HifzEnrollmentSerializer
    permission_classes = [IsAuthenticated]


class HifzDailyProgressViewSet(ModelViewSet):
    queryset = HifzDailyProgress.objects.select_related("student", "teacher").prefetch_related("mistakes")
    serializer_class = HifzDailyProgressSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["student", "teacher", "date"]


class HifzMistakeViewSet(ModelViewSet):
    queryset = HifzMistake.objects.select_related("progress")
    serializer_class = HifzMistakeSerializer
    permission_classes = [IsAuthenticated]


class HifzMonthlyTrackingViewSet(ReadOnlyModelViewSet):
    queryset = HifzMonthlyTracking.objects.select_related("student", "teacher")
    serializer_class = HifzMonthlyTrackingSerializer
    permission_classes = [IsAuthenticated]

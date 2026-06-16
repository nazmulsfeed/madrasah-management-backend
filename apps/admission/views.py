from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils import timezone
from django.views.generic import TemplateView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import AdmissionApplicant, AdmissionApplication, AdmissionDecision, AdmissionEnrollment, AdmissionTracking
from .serializers import (
    AdmissionActionSerializer,
    AdmissionApplicantSerializer,
    AdmissionApplicationSerializer,
    AdmissionDecisionSerializer,
    AdmissionEnrollmentSerializer,
    AdmissionTrackingSerializer,
)
from .services import AdmissionReviewService


class AdmissionDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "admission/dashboard.html"


class AdmissionApplicantViewSet(ModelViewSet):
    queryset = AdmissionApplicant.objects.all()
    serializer_class = AdmissionApplicantSerializer
    permission_classes = [IsAuthenticated]


class AdmissionApplicationViewSet(ModelViewSet):
    queryset = AdmissionApplication.objects.select_related("applicant", "academic_year", "class_level", "department")
    serializer_class = AdmissionApplicationSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(submitted_at=timezone.now())

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        serializer = AdmissionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = AdmissionReviewService.approve(
            self.get_object(), actor=request.user, remarks=serializer.validated_data.get("remarks", "")
        )
        return Response(AdmissionApplicationSerializer(application).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        serializer = AdmissionActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = AdmissionReviewService.reject(
            self.get_object(), actor=request.user, reason=serializer.validated_data.get("reason", "")
        )
        return Response(AdmissionApplicationSerializer(application).data)

    @action(detail=True, methods=["get"])
    def tracking(self, request, pk=None):
        events = self.get_object().tracking_events.select_related("actor")
        return Response(AdmissionTrackingSerializer(events, many=True).data)


class AdmissionTrackingViewSet(ReadOnlyModelViewSet):
    queryset = AdmissionTracking.objects.select_related("application", "actor")
    serializer_class = AdmissionTrackingSerializer
    permission_classes = [IsAuthenticated]


class AdmissionDecisionViewSet(ReadOnlyModelViewSet):
    queryset = AdmissionDecision.objects.select_related("application", "decided_by")
    serializer_class = AdmissionDecisionSerializer
    permission_classes = [IsAuthenticated]


class AdmissionEnrollmentViewSet(ReadOnlyModelViewSet):
    queryset = AdmissionEnrollment.objects.select_related("application", "student", "enrolled_by")
    serializer_class = AdmissionEnrollmentSerializer
    permission_classes = [IsAuthenticated]

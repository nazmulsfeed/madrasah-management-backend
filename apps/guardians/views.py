from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.students.models import Student
from apps.students.serializers import StudentSerializer
from .models import Guardian, GuardianContactPreference, StudentGuardian
from .selectors import children_for_guardian_user, guardians_for_scope
from .serializers import GuardianContactPreferenceSerializer, GuardianSerializer, StudentGuardianSerializer


class GuardianDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "dashboards/guardian.html"


class GuardianViewSet(ModelViewSet):
    serializer_class = GuardianSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["guardian_id", "user__first_name", "user__last_name", "user__phone", "user__email"]

    def get_queryset(self):
        return guardians_for_scope(self.request.user)

    @action(detail=False, methods=["get"])
    def children(self, request):
        links = children_for_guardian_user(request.user)
        return Response(StudentGuardianSerializer(links, many=True).data)

    def _child_response(self, request, section):
        student_id = request.query_params.get("student")
        links = children_for_guardian_user(request.user)
        if student_id:
            links = links.filter(student_id=student_id)
        payload = []
        for link in links:
            payload.append(
                {
                    "student": StudentSerializer(link.student).data,
                    section: [],
                    "integration_status": f"{section} module endpoint reserved for implementation scope.",
                }
            )
        return Response(payload)

    @action(detail=False, methods=["get"], url_path="child-dashboard")
    def child_dashboard(self, request):
        payload = []
        for link in children_for_guardian_user(request.user):
            payload.append(
                {
                    "student": StudentSerializer(link.student).data,
                    "attendance": [],
                    "results": [],
                    "homework": [],
                    "hifz": [],
                    "fees": {},
                }
            )
        return Response(payload)

    @action(detail=False, methods=["get"], url_path="attendance")
    def attendance(self, request):
        return self._child_response(request, "attendance")

    @action(detail=False, methods=["get"], url_path="results")
    def results(self, request):
        return self._child_response(request, "results")

    @action(detail=False, methods=["get"], url_path="homework")
    def homework(self, request):
        return self._child_response(request, "homework")

    @action(detail=False, methods=["get"], url_path="hifz")
    def hifz(self, request):
        return self._child_response(request, "hifz")

    @action(detail=False, methods=["get"], url_path="fee-status")
    def fee_status(self, request):
        return self._child_response(request, "fees")


class StudentGuardianViewSet(ModelViewSet):
    serializer_class = StudentGuardianSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudentGuardian.objects.filter(guardian__in=guardians_for_scope(self.request.user)).select_related(
            "student", "guardian"
        )


class GuardianContactPreferenceViewSet(ModelViewSet):
    serializer_class = GuardianContactPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GuardianContactPreference.objects.filter(guardian__in=guardians_for_scope(self.request.user))

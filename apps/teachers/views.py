from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import Subject, Teacher, TeacherClassAssignment, TeacherSubjectAssignment
from .selectors import assigned_classes_for_user, assigned_subjects_for_user, teachers_for_scope
from .serializers import (
    SubjectSerializer,
    TeacherClassAssignmentSerializer,
    TeacherEntrySerializer,
    TeacherSerializer,
    TeacherSubjectAssignmentSerializer,
)
from .services import TeacherWorkloadService


class TeacherDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "dashboards/teacher.html"


class SubjectViewSet(ModelViewSet):
    queryset = Subject.objects.select_related("institution", "branch")
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "code"]


class TeacherViewSet(ModelViewSet):
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["employee_id", "user__first_name", "user__last_name", "user__phone", "user__email"]

    def get_queryset(self):
        return teachers_for_scope(self.request.user)

    @action(detail=False, methods=["get"], url_path="assigned-classes")
    def assigned_classes(self, request):
        return Response(TeacherClassAssignmentSerializer(assigned_classes_for_user(request.user), many=True).data)

    @action(detail=False, methods=["get"], url_path="assigned-subjects")
    def assigned_subjects(self, request):
        return Response(TeacherSubjectAssignmentSerializer(assigned_subjects_for_user(request.user), many=True).data)

    @action(detail=True, methods=["get"], url_path="workload")
    def workload(self, request, pk=None):
        return Response(TeacherWorkloadService.summary(self.get_object()))

    def _entry_response(self, request, entry_type):
        serializer = TeacherEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            {
                "entry_type": entry_type,
                "status": "accepted",
                "payload": serializer.validated_data,
                "integration_status": f"{entry_type} service endpoint reserved for dedicated module integration.",
            }
        )

    @action(detail=False, methods=["post"], url_path="attendance-entry")
    def attendance_entry(self, request):
        return self._entry_response(request, "attendance")

    @action(detail=False, methods=["post"], url_path="homework-entry")
    def homework_entry(self, request):
        return self._entry_response(request, "homework")

    @action(detail=False, methods=["post"], url_path="result-entry")
    def result_entry(self, request):
        return self._entry_response(request, "result")


class TeacherClassAssignmentViewSet(ModelViewSet):
    serializer_class = TeacherClassAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return assigned_classes_for_user(self.request.user)


class TeacherSubjectAssignmentViewSet(ModelViewSet):
    serializer_class = TeacherSubjectAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return assigned_subjects_for_user(self.request.user)

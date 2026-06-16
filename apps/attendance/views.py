from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.guardians.selectors import children_for_guardian_user
from apps.students.models import Student
from .models import AttendanceDailyReport, AttendanceMonthlyReport, StudentAttendance, StudentAttendanceSession, TeacherAttendance
from .serializers import (
    AttendanceDailyReportSerializer,
    AttendanceMonthlyReportSerializer,
    MarkAttendanceSerializer,
    StudentAttendanceSerializer,
    StudentAttendanceSessionSerializer,
    TeacherAttendanceSerializer,
)
from .services import AttendanceReportService, StudentAttendanceMarkingService


class AttendanceDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "attendance/dashboard.html"


class StudentAttendanceSessionViewSet(ModelViewSet):
    queryset = StudentAttendanceSession.objects.select_related("academic_year", "class_level", "section")
    serializer_class = StudentAttendanceSessionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def mark(self, request, pk=None):
        session = self.get_object()
        serializer = MarkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = Student.objects.get(id=serializer.validated_data["student"])
        record = StudentAttendanceMarkingService.mark(
            session, student, serializer.validated_data["status"], serializer.validated_data.get("remarks", "")
        )
        return Response(StudentAttendanceSerializer(record).data)

    @action(detail=True, methods=["post"], url_path="generate-daily-report")
    def generate_daily_report(self, request, pk=None):
        return Response(AttendanceDailyReportSerializer(AttendanceReportService.generate_daily(self.get_object())).data)


class StudentAttendanceViewSet(ModelViewSet):
    queryset = StudentAttendance.objects.select_related("attendance_session", "student")
    serializer_class = StudentAttendanceSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="guardian")
    def guardian(self, request):
        student_ids = children_for_guardian_user(request.user).values_list("student_id", flat=True)
        records = self.get_queryset().filter(student_id__in=student_ids, guardian_visible=True)
        return Response(StudentAttendanceSerializer(records, many=True).data)


class TeacherAttendanceViewSet(ModelViewSet):
    queryset = TeacherAttendance.objects.select_related("teacher", "institution", "branch")
    serializer_class = TeacherAttendanceSerializer
    permission_classes = [IsAuthenticated]


class AttendanceDailyReportViewSet(ReadOnlyModelViewSet):
    queryset = AttendanceDailyReport.objects.select_related("class_level", "section")
    serializer_class = AttendanceDailyReportSerializer
    permission_classes = [IsAuthenticated]


class AttendanceMonthlyReportViewSet(ReadOnlyModelViewSet):
    queryset = AttendanceMonthlyReport.objects.select_related("academic_year", "class_level", "section")
    serializer_class = AttendanceMonthlyReportSerializer
    permission_classes = [IsAuthenticated]

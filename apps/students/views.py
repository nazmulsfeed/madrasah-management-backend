from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.common.models import AcademicYear
from .models import ClassLevel, Section, Student, StudentEnrollment
from .selectors import search_students, students_for_scope
from .serializers import (
    ClassLevelSerializer,
    SectionSerializer,
    StudentEnrollmentSerializer,
    StudentPromotionSerializer,
    StudentSerializer,
    StudentStatusChangeSerializer,
)
from .services import StudentPromotionService, StudentStatusService


class StudentListView(LoginRequiredMixin, ListView):
    model = Student
    template_name = "students/student_list.html"
    context_object_name = "students"

    def get_queryset(self):
        return search_students(self.request.user, self.request.GET.get("q", ""))


class StudentViewSet(ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["admission_number", "student_id", "user__first_name", "user__last_name", "user__phone"]
    ordering_fields = ["admission_number", "admission_date", "created_at"]

    def get_queryset(self):
        return students_for_scope(self.request.user)

    @action(detail=False, methods=["get"])
    def search(self, request):
        queryset = search_students(request.user, request.query_params.get("q", ""))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(StudentSerializer(page, many=True).data)
        return Response(StudentSerializer(queryset, many=True).data)

    @action(detail=True, methods=["post"])
    def promote(self, request, pk=None):
        student = self.get_object()
        serializer = StudentPromotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enrollment = StudentPromotionService.promote(
            student=student,
            academic_year=AcademicYear.objects.get(id=data["academic_year"]),
            class_level=ClassLevel.objects.get(id=data["class_level"]),
            section=Section.objects.get(id=data["section"]),
            roll_number=data["roll_number"],
            start_date=data["start_date"],
            actor=request.user,
            remarks=data.get("remarks", ""),
        )
        return Response(StudentEnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        student = self.get_object()
        serializer = StudentStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = StudentStatusService.change_status(
            student, serializer.validated_data["status"], request.user, serializer.validated_data.get("reason", "")
        )
        return Response(StudentSerializer(student).data)


class ClassLevelViewSet(ModelViewSet):
    queryset = ClassLevel.objects.select_related("institution", "branch")
    serializer_class = ClassLevelSerializer
    permission_classes = [IsAuthenticated]


class SectionViewSet(ModelViewSet):
    queryset = Section.objects.select_related("class_level", "class_teacher")
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]


class StudentEnrollmentViewSet(ReadOnlyModelViewSet):
    serializer_class = StudentEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudentEnrollment.objects.filter(student__in=students_for_scope(self.request.user))

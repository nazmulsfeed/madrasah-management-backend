from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.common.models import AcademicYear
from apps.students.models import ClassLevel, Section
from apps.teachers.models import Subject
from .models import AcademicSession, ClassDepartment, ClassSubject, Department, Period, Room, Timetable, TimetableSlot
from .serializers import (
    AcademicSessionSerializer,
    AcademicYearSerializer,
    ClassDepartmentSerializer,
    ClassLevelSerializer,
    ClassSubjectSerializer,
    DepartmentSerializer,
    PeriodSerializer,
    RoomSerializer,
    SectionSerializer,
    SubjectSerializer,
    TimetableSerializer,
    TimetableSlotSerializer,
)


class AcademicsDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "academics/dashboard.html"


class AcademicYearViewSet(ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]


class AcademicSessionViewSet(ModelViewSet):
    queryset = AcademicSession.objects.select_related("academic_year", "institution", "branch")
    serializer_class = AcademicSessionSerializer
    permission_classes = [IsAuthenticated]


class ClassLevelViewSet(ModelViewSet):
    queryset = ClassLevel.objects.select_related("institution", "branch")
    serializer_class = ClassLevelSerializer
    permission_classes = [IsAuthenticated]


class SectionViewSet(ModelViewSet):
    queryset = Section.objects.select_related("class_level", "class_teacher")
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]


class SubjectViewSet(ModelViewSet):
    queryset = Subject.objects.select_related("institution", "branch")
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]


class DepartmentViewSet(ModelViewSet):
    queryset = Department.objects.select_related("institution", "branch", "head")
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]


class ClassDepartmentViewSet(ModelViewSet):
    queryset = ClassDepartment.objects.select_related("class_level", "department")
    serializer_class = ClassDepartmentSerializer
    permission_classes = [IsAuthenticated]


class ClassSubjectViewSet(ModelViewSet):
    queryset = ClassSubject.objects.select_related("class_level", "subject", "academic_year", "department")
    serializer_class = ClassSubjectSerializer
    permission_classes = [IsAuthenticated]


class RoomViewSet(ModelViewSet):
    queryset = Room.objects.select_related("institution", "branch")
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]


class PeriodViewSet(ModelViewSet):
    queryset = Period.objects.select_related("institution", "branch")
    serializer_class = PeriodSerializer
    permission_classes = [IsAuthenticated]


class TimetableViewSet(ModelViewSet):
    queryset = Timetable.objects.select_related("academic_year", "session", "class_level", "section")
    serializer_class = TimetableSerializer
    permission_classes = [IsAuthenticated]


class TimetableSlotViewSet(ModelViewSet):
    queryset = TimetableSlot.objects.select_related("timetable", "period", "subject", "teacher", "room")
    serializer_class = TimetableSlotSerializer
    permission_classes = [IsAuthenticated]

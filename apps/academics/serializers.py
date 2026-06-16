from rest_framework import serializers

from apps.common.models import AcademicYear
from apps.students.models import ClassLevel, Section
from apps.teachers.models import Subject
from .models import AcademicSession, ClassDepartment, ClassSubject, Department, Period, Room, Timetable, TimetableSlot


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class ClassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassLevel
        fields = "__all__"


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = "__all__"


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class AcademicSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicSession
        fields = "__all__"


class ClassDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassDepartment
        fields = "__all__"


class ClassSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassSubject
        fields = "__all__"


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"


class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = "__all__"


class TimetableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Timetable
        fields = "__all__"


class TimetableSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableSlot
        fields = "__all__"

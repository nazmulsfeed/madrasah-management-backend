from rest_framework import serializers

from .models import AttendanceDailyReport, AttendanceMonthlyReport, StudentAttendance, StudentAttendanceSession, TeacherAttendance


class StudentAttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAttendanceSession
        fields = "__all__"


class StudentAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAttendance
        fields = "__all__"


class TeacherAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAttendance
        fields = "__all__"


class AttendanceDailyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceDailyReport
        fields = "__all__"


class AttendanceMonthlyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceMonthlyReport
        fields = "__all__"


class MarkAttendanceSerializer(serializers.Serializer):
    student = serializers.UUIDField()
    status = serializers.ChoiceField(choices=StudentAttendance.STATUS_CHOICES)
    remarks = serializers.CharField(required=False, allow_blank=True)

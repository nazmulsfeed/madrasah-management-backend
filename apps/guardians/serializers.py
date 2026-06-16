from rest_framework import serializers

from apps.students.serializers import StudentSerializer
from .models import Guardian, GuardianContactPreference, StudentGuardian


class GuardianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = "__all__"


class StudentGuardianSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source="student", read_only=True)

    class Meta:
        model = StudentGuardian
        fields = "__all__"


class GuardianContactPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuardianContactPreference
        fields = "__all__"


class ChildDashboardSerializer(serializers.Serializer):
    student = StudentSerializer()
    attendance = serializers.ListField(child=serializers.DictField(), default=list)
    results = serializers.ListField(child=serializers.DictField(), default=list)
    homework = serializers.ListField(child=serializers.DictField(), default=list)
    hifz = serializers.ListField(child=serializers.DictField(), default=list)
    fees = serializers.DictField(default=dict)

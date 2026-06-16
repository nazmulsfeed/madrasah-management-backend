from rest_framework import serializers

from .models import (
    ClassLevel,
    Section,
    Student,
    StudentClassHistory,
    StudentDocument,
    StudentEnrollment,
    StudentMedicalInfo,
    StudentPreviousEducation,
    StudentProfile,
    StudentStatusHistory,
)


class ClassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassLevel
        fields = "__all__"


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = "__all__"


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = "__all__"


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentEnrollment
        fields = "__all__"


class StudentSerializer(serializers.ModelSerializer):
    profile = StudentProfileSerializer(read_only=True)
    current_enrollment_detail = StudentEnrollmentSerializer(source="current_enrollment", read_only=True)

    class Meta:
        model = Student
        fields = "__all__"


class StudentClassHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentClassHistory
        fields = "__all__"


class StudentStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentStatusHistory
        fields = "__all__"


class StudentDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDocument
        fields = "__all__"


class StudentMedicalInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentMedicalInfo
        fields = "__all__"


class StudentPreviousEducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentPreviousEducation
        fields = "__all__"


class StudentPromotionSerializer(serializers.Serializer):
    academic_year = serializers.UUIDField()
    class_level = serializers.UUIDField()
    section = serializers.UUIDField()
    roll_number = serializers.CharField(max_length=30)
    start_date = serializers.DateField()
    remarks = serializers.CharField(required=False, allow_blank=True)


class StudentStatusChangeSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Student.STATUS_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True)

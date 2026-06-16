from rest_framework import serializers

from .models import (
    Subject,
    Teacher,
    TeacherClassAssignment,
    TeacherDocument,
    TeacherEmployment,
    TeacherProfile,
    TeacherSubjectAssignment,
)


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"


class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = "__all__"


class TeacherEmploymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherEmployment
        fields = "__all__"


class TeacherSerializer(serializers.ModelSerializer):
    profile = TeacherProfileSerializer(read_only=True)
    employment = TeacherEmploymentSerializer(read_only=True)

    class Meta:
        model = Teacher
        fields = "__all__"


class TeacherSubjectAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherSubjectAssignment
        fields = "__all__"


class TeacherClassAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherClassAssignment
        fields = "__all__"


class TeacherDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherDocument
        fields = "__all__"


class TeacherEntrySerializer(serializers.Serializer):
    class_level = serializers.UUIDField()
    section = serializers.UUIDField(required=False)
    subject = serializers.UUIDField(required=False)
    student = serializers.UUIDField(required=False)
    entry_date = serializers.DateField(required=False)
    payload = serializers.DictField(default=dict)

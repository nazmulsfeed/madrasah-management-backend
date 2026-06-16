from rest_framework import serializers

from .models import Exam, ExamSchedule, ExamSubject, ExamTerm, GradeRule, GradeScale, MarkEntry, Result, ResultSubject, Transcript


class ExamTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamTerm
        fields = "__all__"


class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = "__all__"


class ExamSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSubject
        fields = "__all__"


class ExamScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSchedule
        fields = "__all__"


class GradeScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeScale
        fields = "__all__"


class GradeRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeRule
        fields = "__all__"


class MarkEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MarkEntry
        fields = "__all__"


class ResultSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResultSubject
        fields = "__all__"


class ResultSerializer(serializers.ModelSerializer):
    subjects = ResultSubjectSerializer(many=True, read_only=True)

    class Meta:
        model = Result
        fields = "__all__"


class TranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcript
        fields = "__all__"

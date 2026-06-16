from rest_framework import serializers

from .models import DailyLessonReport, LessonReportAttachment


class LessonReportAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonReportAttachment
        fields = "__all__"


class DailyLessonReportSerializer(serializers.ModelSerializer):
    attachments = LessonReportAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = DailyLessonReport
        fields = "__all__"

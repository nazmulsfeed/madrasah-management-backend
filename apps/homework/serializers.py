from rest_framework import serializers

from .models import Homework, HomeworkAttachment, HomeworkReview, HomeworkSubmission


class HomeworkAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeworkAttachment
        fields = "__all__"


class HomeworkSerializer(serializers.ModelSerializer):
    attachments = HomeworkAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Homework
        fields = "__all__"


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeworkSubmission
        fields = "__all__"


class HomeworkReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeworkReview
        fields = "__all__"

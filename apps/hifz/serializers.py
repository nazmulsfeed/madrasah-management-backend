from rest_framework import serializers

from .models import HifzDailyProgress, HifzEnrollment, HifzMistake, HifzMonthlyTracking


class HifzEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = HifzEnrollment
        fields = "__all__"


class HifzMistakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HifzMistake
        fields = "__all__"


class HifzDailyProgressSerializer(serializers.ModelSerializer):
    mistakes = HifzMistakeSerializer(many=True, read_only=True)

    class Meta:
        model = HifzDailyProgress
        fields = "__all__"


class HifzMonthlyTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = HifzMonthlyTracking
        fields = "__all__"

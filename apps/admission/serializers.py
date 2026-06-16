from rest_framework import serializers

from .models import AdmissionApplicant, AdmissionApplication, AdmissionDecision, AdmissionEnrollment, AdmissionTracking


class AdmissionApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionApplicant
        fields = "__all__"


class AdmissionApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionApplication
        fields = "__all__"
        read_only_fields = ("reviewed_by", "reviewed_at", "rejection_reason")


class AdmissionTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionTracking
        fields = "__all__"


class AdmissionDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionDecision
        fields = "__all__"


class AdmissionEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionEnrollment
        fields = "__all__"


class AdmissionActionSerializer(serializers.Serializer):
    remarks = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)

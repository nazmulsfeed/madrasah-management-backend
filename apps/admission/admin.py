from django.contrib import admin

from .models import AdmissionApplicant, AdmissionApplication, AdmissionDecision, AdmissionEnrollment, AdmissionTracking

admin.site.register(AdmissionApplicant)
admin.site.register(AdmissionApplication)
admin.site.register(AdmissionDecision)
admin.site.register(AdmissionEnrollment)
admin.site.register(AdmissionTracking)

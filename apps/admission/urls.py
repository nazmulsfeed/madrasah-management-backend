from django.urls import path

from .views import AdmissionDashboardView

app_name = "admission"

urlpatterns = [path("", AdmissionDashboardView.as_view(), name="dashboard")]

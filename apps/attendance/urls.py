from django.urls import path

from .views import AttendanceDashboardView

app_name = "attendance"

urlpatterns = [path("", AttendanceDashboardView.as_view(), name="dashboard")]

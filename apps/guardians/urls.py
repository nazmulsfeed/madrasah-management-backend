from django.urls import path

from .views import GuardianDashboardView

app_name = "guardians"

urlpatterns = [
    path("dashboard/", GuardianDashboardView.as_view(), name="dashboard"),
]

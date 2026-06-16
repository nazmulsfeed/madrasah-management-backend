from django.urls import path

from .views import HifzDashboardView

app_name = "hifz"

urlpatterns = [path("", HifzDashboardView.as_view(), name="dashboard")]

from django.urls import path

from .views import AcademicsDashboardView

app_name = "academics"

urlpatterns = [path("", AcademicsDashboardView.as_view(), name="dashboard")]

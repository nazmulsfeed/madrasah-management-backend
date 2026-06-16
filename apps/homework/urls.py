from django.urls import path

from .views import HomeworkDashboardView

app_name = "homework"

urlpatterns = [path("", HomeworkDashboardView.as_view(), name="dashboard")]

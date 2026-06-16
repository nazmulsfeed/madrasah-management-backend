from django.urls import path

from .views import ExamsDashboardView

app_name = "exams"

urlpatterns = [path("", ExamsDashboardView.as_view(), name="dashboard")]

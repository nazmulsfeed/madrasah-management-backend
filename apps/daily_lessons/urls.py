from django.urls import path

from .views import DailyLessonsDashboardView

app_name = "daily_lessons"

urlpatterns = [path("", DailyLessonsDashboardView.as_view(), name="dashboard")]

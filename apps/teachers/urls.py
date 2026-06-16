from django.urls import path

from .views import TeacherDashboardView

app_name = "teachers"

urlpatterns = [
    path("dashboard/", TeacherDashboardView.as_view(), name="dashboard"),
]

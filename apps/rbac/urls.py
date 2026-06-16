from django.urls import path

from .views import RBACDashboardView

app_name = "rbac"

urlpatterns = [
    path("", RBACDashboardView.as_view(), name="dashboard"),
]

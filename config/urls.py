from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.accounts.views import LoginAPIView, LogoutAPIView, MeAPIView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("apps.accounts.urls")),
    path("rbac/", include("apps.rbac.urls")),
    path("students/", include("apps.students.urls")),
    path("guardians/", include("apps.guardians.urls")),
    path("teachers/", include("apps.teachers.urls")),
    path("academics/", include("apps.academics.urls")),
    path("admission/", include("apps.admission.urls")),
    path("attendance/", include("apps.attendance.urls")),
    path("exams/", include("apps.exams.urls")),
    path("hifz/", include("apps.hifz.urls")),
    path("homework/", include("apps.homework.urls")),
    path("daily-lessons/", include("apps.daily_lessons.urls")),
    path("api/v1/accounts/", include("apps.accounts.api_urls")),
    path("api/v1/auth/login/", LoginAPIView.as_view(), name="api-auth-login"),
    path("api/v1/auth/logout/", LogoutAPIView.as_view(), name="api-auth-logout"),
    path("api/v1/auth/me/", MeAPIView.as_view(), name="api-auth-me"),
    path("api/v1/rbac/", include("apps.rbac.api_urls")),
    path("api/v1/students/", include("apps.students.api_urls")),
    path("api/v1/guardians/", include("apps.guardians.api_urls")),
    path("api/v1/teachers/", include("apps.teachers.api_urls")),
    path("api/v1/academics/", include("apps.academics.api_urls")),
    path("api/v1/admission/", include("apps.admission.api_urls")),
    path("api/v1/attendance/", include("apps.attendance.api_urls")),
    path("api/v1/exams/", include("apps.exams.api_urls")),
    path("api/v1/hifz/", include("apps.hifz.api_urls")),
    path("api/v1/homework/", include("apps.homework.api_urls")),
    path("api/v1/daily-lessons/", include("apps.daily_lessons.api_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LoginAPIView, LoginHistoryViewSet, LogoutAPIView, MeAPIView, UserProfileViewSet, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("profiles", UserProfileViewSet, basename="profiles")
router.register("login-history", LoginHistoryViewSet, basename="login-history")

urlpatterns = [
    path("auth/login/", LoginAPIView.as_view(), name="api-login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="api-logout"),
    path("auth/me/", MeAPIView.as_view(), name="api-me"),
    path("", include(router.urls)),
]

from django.urls import path

from .views import (
    ProfileView,
    UserLoginView,
    UserLogoutView,
    UserPasswordResetCompleteView,
    UserPasswordResetConfirmView,
    UserPasswordResetDoneView,
    UserPasswordResetView,
)

app_name = "accounts"

urlpatterns = [
    path("login/", UserLoginView.as_view(), name="login"),
    path("logout/", UserLogoutView.as_view(), name="logout"),
    path("password-reset/", UserPasswordResetView.as_view(), name="password_reset"),
    path("password-reset/done/", UserPasswordResetDoneView.as_view(), name="password_reset_done"),
    path("password-reset/<uidb64>/<token>/", UserPasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("password-reset/complete/", UserPasswordResetCompleteView.as_view(), name="password_reset_complete"),
    path("profile/", ProfileView.as_view(), name="profile"),
]

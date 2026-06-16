from django.contrib.auth import login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import (
    LoginView,
    LogoutView,
    PasswordResetCompleteView,
    PasswordResetConfirmView,
    PasswordResetDoneView,
    PasswordResetView,
)
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView, UpdateView
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .forms import ProfileForm
from .models import LoginHistory, User, UserProfile
from .selectors import users_for_scope
from .serializers import LoginHistorySerializer, LoginSerializer, UserCreateSerializer, UserProfileSerializer, UserSerializer
from .services import LoginAuditService


class UserLoginView(LoginView):
    template_name = "accounts/login.html"

    def form_valid(self, form):
        response = super().form_valid(form)
        LoginAuditService.record(self.request, self.request.user, True)
        return response


class UserLogoutView(LogoutView):
    pass


class UserPasswordResetView(PasswordResetView):
    template_name = "accounts/password_reset.html"
    email_template_name = "accounts/password_reset_email.html"
    success_url = reverse_lazy("accounts:password_reset_done")


class UserPasswordResetDoneView(PasswordResetDoneView):
    template_name = "accounts/password_reset_done.html"


class UserPasswordResetConfirmView(PasswordResetConfirmView):
    template_name = "accounts/password_reset_confirm.html"
    success_url = reverse_lazy("accounts:password_reset_complete")


class UserPasswordResetCompleteView(PasswordResetCompleteView):
    template_name = "accounts/password_reset_complete.html"


class ProfileView(LoginRequiredMixin, UpdateView):
    model = UserProfile
    form_class = ProfileForm
    template_name = "accounts/profile.html"
    success_url = reverse_lazy("accounts:profile")

    def get_object(self, queryset=None):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class DashboardRedirectView(LoginRequiredMixin, TemplateView):
    template_name = "dashboards/default.html"


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        LoginAuditService.record(request, user, True)
        token = serializer.create_token()
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete() if hasattr(request.user, "auth_token") else None
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ["username", "email", "first_name", "last_name", "phone"]
    ordering_fields = ["username", "date_joined"]

    def get_queryset(self):
        return users_for_scope(self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(UserSerializer(user).data)


class UserProfileViewSet(ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user__in=users_for_scope(self.request.user))


class LoginHistoryViewSet(ReadOnlyModelViewSet):
    serializer_class = LoginHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LoginHistory.objects.filter(user__in=users_for_scope(self.request.user)).select_related("user")

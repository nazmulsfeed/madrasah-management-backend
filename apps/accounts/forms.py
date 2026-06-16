from django import forms
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User, UserProfile


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("username", "email", "phone", "first_name", "last_name", "user_type", "institution", "branch")


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ("username", "email", "phone", "first_name", "last_name", "user_type", "photo", "is_active")


class ProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ("date_of_birth", "gender", "blood_group", "national_id", "emergency_contact", "bio")

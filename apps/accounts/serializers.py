from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from .models import LoginHistory, User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = "__all__"
        read_only_fields = ("user",)


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "phone",
            "first_name",
            "last_name",
            "user_type",
            "photo",
            "institution",
            "branch",
            "is_active",
            "profile",
        )
        read_only_fields = ("id", "is_active")


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "phone",
            "first_name",
            "last_name",
            "user_type",
            "institution",
            "branch",
            "password",
        )
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(request, username=attrs["username"], password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        attrs["user"] = user
        return attrs

    def create_token(self):
        token, _ = Token.objects.get_or_create(user=self.validated_data["user"])
        return token


class LoginHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginHistory
        fields = "__all__"

from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    company = serializers.CharField(source="company_id", read_only=True)
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role", "company")


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs.get("username"), password=attrs.get("password"))
        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = user
        return attrs

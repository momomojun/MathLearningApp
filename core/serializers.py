from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    nickname = serializers.CharField(required=False, allow_blank=True, max_length=50)
    organization = serializers.CharField(required=False, allow_blank=True, max_length=100)
    is_member = serializers.BooleanField(required=False, default=False)
    membership_days_remaining = serializers.IntegerField(required=False, min_value=0, default=0)

    class Meta:
        model = get_user_model()
        fields = (
            "id",
            "username",
            "password",
            "email",
            "nickname",
            "organization",
            "is_member",
            "membership_days_remaining",
        )
        read_only_fields = ("id",)
        extra_kwargs = {
            "email": {"required": True, "allow_blank": False},
        }

    def validate_username(self, value):
        queryset = get_user_model().objects.filter(username=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("账号已存在")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile = UserProfile.objects.filter(user=instance).first()
        data["nickname"] = profile.nickname if profile else instance.first_name
        data["organization"] = profile.organization if profile else ""
        data["is_member"] = profile.is_member if profile else False
        data["membership_days_remaining"] = (
            profile.membership_days_remaining if profile else 0
        )
        return data

    def create(self, validated_data):
        profile_data = self._pop_profile_data(validated_data)
        password = validated_data.pop("password")
        nickname = profile_data.get("nickname", "")

        user = get_user_model()(**validated_data)
        user.first_name = nickname
        user.set_password(password)
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        self._update_profile(profile, profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = self._pop_profile_data(validated_data)
        password = validated_data.pop("password", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if "nickname" in profile_data:
            instance.first_name = profile_data["nickname"]

        if password:
            instance.set_password(password)

        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        self._update_profile(profile, profile_data)
        return instance

    def _pop_profile_data(self, data):
        return {
            key: data.pop(key)
            for key in (
                "nickname",
                "organization",
                "is_member",
                "membership_days_remaining",
            )
            if key in data
        }

    def _update_profile(self, profile, profile_data):
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.save()

from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.urls import reverse
from django.utils.html import format_html

from .models import UserProfile

User = get_user_model()


class ProfileFieldsMixin(forms.ModelForm):
    nickname = forms.CharField(label="昵称", max_length=50, required=False)
    organization = forms.CharField(label="机构", max_length=100, required=False)
    is_member = forms.BooleanField(label="是否为会员", required=False)
    membership_days_remaining = forms.IntegerField(
        label="会员剩余订阅时长/天",
        min_value=0,
        required=False,
        initial=0,
    )

    def load_profile_initial(self):
        if not self.instance or not self.instance.pk:
            return

        profile = UserProfile.objects.filter(user=self.instance).first()
        if not profile:
            return

        self.fields["nickname"].initial = profile.nickname
        self.fields["organization"].initial = profile.organization
        self.fields["is_member"].initial = profile.is_member
        self.fields["membership_days_remaining"].initial = profile.membership_days_remaining

    def clean_membership_days_remaining(self):
        return self.cleaned_data.get("membership_days_remaining") or 0


class ManagedUserCreationForm(ProfileFieldsMixin, UserCreationForm):
    email = forms.EmailField(label="邮箱", required=True)

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email")


class ManagedUserChangeForm(ProfileFieldsMixin, UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.load_profile_initial()


class UserTypeFilter(admin.SimpleListFilter):
    title = "用户类型"
    parameter_name = "user_type"

    def lookups(self, request, model_admin):
        return (
            ("superuser", "超级管理员"),
            ("member", "会员用户"),
            ("normal", "普通用户"),
        )

    def queryset(self, request, queryset):
        if self.value() == "superuser":
            return queryset.filter(is_superuser=True)
        if self.value() == "member":
            return queryset.filter(is_superuser=False, profile__is_member=True)
        if self.value() == "normal":
            return queryset.filter(is_superuser=False).exclude(profile__is_member=True)
        return queryset


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = ManagedUserChangeForm
    add_form = ManagedUserCreationForm
    list_select_related = ("profile",)
    list_display = (
        "username",
        "email",
        "user_type",
        "nickname",
        "organization",
        "is_member",
        "membership_days_remaining",
        "is_active",
        "date_joined",
        "edit_link",
    )
    list_filter = (UserTypeFilter, "is_active", "is_staff", "date_joined")
    search_fields = (
        "username",
        "email",
        "first_name",
        "profile__nickname",
        "profile__organization",
    )

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("基本信息", {"fields": ("email", "first_name", "last_name")}),
        ("会员资料", {"fields": ("nickname", "organization", "is_member", "membership_days_remaining")}),
        (
            "权限",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("重要日期", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "password1",
                    "password2",
                    "nickname",
                    "organization",
                    "is_member",
                    "membership_days_remaining",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                ),
            },
        ),
    )

    @admin.display(description="用户类型", ordering="is_superuser")
    def user_type(self, obj):
        if obj.is_superuser:
            return "超级管理员"
        if self._profile(obj).is_member:
            return "会员用户"
        return "普通用户"

    @admin.display(description="昵称", ordering="profile__nickname")
    def nickname(self, obj):
        return self._profile(obj).nickname or obj.first_name

    @admin.display(description="机构", ordering="profile__organization")
    def organization(self, obj):
        return self._profile(obj).organization

    @admin.display(boolean=True, description="是否为会员", ordering="profile__is_member")
    def is_member(self, obj):
        return self._profile(obj).is_member

    @admin.display(description="会员剩余订阅时长/天", ordering="profile__membership_days_remaining")
    def membership_days_remaining(self, obj):
        return self._profile(obj).membership_days_remaining

    @admin.display(description="操作")
    def edit_link(self, obj):
        url = reverse("admin:auth_user_change", args=[obj.pk])
        return format_html('<a class="button" href="{}">编辑</a>', url)

    def save_model(self, request, obj, form, change):
        nickname = form.cleaned_data.get("nickname", "")
        obj.first_name = nickname or obj.first_name
        super().save_model(request, obj, form, change)

        profile, _ = UserProfile.objects.get_or_create(user=obj)
        profile.nickname = nickname
        profile.organization = form.cleaned_data.get("organization", "")
        profile.is_member = form.cleaned_data.get("is_member", False)
        profile.membership_days_remaining = form.cleaned_data.get("membership_days_remaining", 0)
        profile.save()

    def _profile(self, obj):
        profile = getattr(obj, "profile", None)
        if profile:
            return profile
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        return profile

from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .serializers import UserSerializer


class IsSelfOrAdmin(BasePermission):
    """仅允许本人或管理员操作某个用户对象。"""

    def has_object_permission(self, request, view, obj):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_staff or obj.pk == user.pk))


class UserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.select_related("profile").order_by("-date_joined")
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ("create", "schema"):
            return [AllowAny()]
        if self.action == "list":
            return [IsAdminUser()]
        return [IsAuthenticated(), IsSelfOrAdmin()]

    @action(detail=False, methods=["get"], url_path="schema")
    def schema(self, request):
        return Response(
            {
                "create": {
                    "method": "POST",
                    "url": "/api/users/",
                    "fields": {
                        "username": "账号，必填，唯一",
                        "password": "密码，必填，至少 8 位",
                        "email": "邮箱，必填",
                        "nickname": "昵称，可选",
                        "organization": "机构，可选",
                        "is_member": "是否为会员，可选，true/false",
                        "membership_days_remaining": "会员剩余订阅时长，可选，单位：天",
                    },
                }
            },
            status=status.HTTP_200_OK,
        )

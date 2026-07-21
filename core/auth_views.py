from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializers import UserSerializer


class LoginView(APIView):
    """账号密码登录，成功后返回 token 和用户信息。"""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        if not username or not password:
            return Response(
                {"detail": "账号和密码不能为空"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "账号或密码错误"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.is_active:
            return Response(
                {"detail": "账号已被禁用"},
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    """删除当前 token，使其失效。"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """返回或更新当前登录用户信息。"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        data = request.data
        profile, _ = UserProfile.objects.get_or_create(user=user)

        # 只允许本人修改昵称、机构、邮箱、密码；
        # is_member / membership_days_remaining 等特权字段必须走管理员后台。
        if "nickname" in data:
            nickname = str(data.get("nickname") or "")
            profile.nickname = nickname
            user.first_name = nickname

        if "organization" in data:
            profile.organization = str(data.get("organization") or "")

        if "email" in data:
            email = str(data.get("email") or "").strip()
            if not email:
                return Response({"detail": "邮箱不能为空"}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email

        new_password = data.get("new_password")
        if new_password:
            old_password = data.get("old_password")
            if not old_password or not user.check_password(old_password):
                return Response({"detail": "原密码不正确"}, status=status.HTTP_400_BAD_REQUEST)
            if len(new_password) < 8:
                return Response({"detail": "新密码至少 8 位"}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)

        user.save()
        profile.save()

        return Response(UserSerializer(user).data)

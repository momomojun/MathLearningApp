from rest_framework import permissions, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, Section
from .serializers import CourseDetailSerializer, CourseListSerializer, SectionContentSerializer


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """课程列表 / 课程详情（章节+小节元信息，不含正文）。公开可读。"""

    queryset = Course.objects.filter(is_published=True).order_by("order", "id")
    lookup_field = "slug"
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action == "list":
            return CourseListSerializer
        return CourseDetailSerializer


def _is_member(user):
    if not user or not user.is_authenticated:
        return False
    profile = getattr(user, "profile", None)
    return bool(profile and profile.is_member)


class SectionContentView(APIView):
    """按 slug 返回单个小节的正文；会员内容在后端也做一次权限校验，
    不完全依赖前端的显示/隐藏逻辑。"""

    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            section = Section.objects.select_related("chapter__course").get(
                slug=slug, is_published=True
            )
        except Section.DoesNotExist as exc:
            raise NotFound("内容不存在") from exc

        if section.access == Section.ACCESS_MEMBER and not _is_member(request.user):
            raise PermissionDenied("该内容为会员专享，请先登录并开通会员")

        return Response(SectionContentSerializer(section).data)

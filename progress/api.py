from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ProblemRecord, SectionRecord
from .serializers import ProblemRecordSerializer, SectionRecordSerializer
from .services import (
    clear_section_history,
    merge_snapshot,
    upsert_problem,
    upsert_section,
)


def _snapshot(user):
    """当前用户的完整进度快照，供前端登录后一次性水合。"""
    sections = SectionRecord.objects.filter(user=user)
    problems = ProblemRecord.objects.filter(user=user)
    return {
        "sections": SectionRecordSerializer(sections, many=True).data,
        "problems": ProblemRecordSerializer(problems, many=True).data,
    }


class ProgressSnapshotView(APIView):
    """GET：拉取当前用户的全部学习进度、收藏、错题记录。"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_snapshot(request.user))


class SectionRecordView(APIView):
    """POST：单条小节 upsert（标记已读 / 切换收藏 / 记录最近学习）。"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            record = upsert_section(request.user, request.data or {})
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SectionRecordSerializer(record).data)


class SectionHistoryClearView(APIView):
    """POST：清空已读与最近学习（保留收藏）。"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        clear_section_history(request.user)
        return Response({"ok": True})


class ProblemRecordView(APIView):
    """POST：单条做题记录 upsert（做过 / 做错 / 收藏 / 错题本）。"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            record = upsert_problem(request.user, request.data or {})
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProblemRecordSerializer(record).data)


class ProgressMergeView(APIView):
    """POST：首登自动合并本地数据，合并后返回最新快照。

    请求体：{"sections": [...], "problems": [...]}，元素形状与快照一致。
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        payload = request.data or {}
        result = merge_snapshot(
            request.user,
            sections=payload.get("sections"),
            problems=payload.get("problems"),
        )
        snapshot = _snapshot(request.user)
        snapshot["merged"] = result
        return Response(snapshot)

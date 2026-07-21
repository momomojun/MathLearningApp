from rest_framework import serializers

from .models import ProblemRecord, SectionRecord


class SectionRecordSerializer(serializers.ModelSerializer):
    """小节记录的对外表示，字段名与前端本地状态保持一致，便于直接水合。"""

    at = serializers.SerializerMethodField()

    class Meta:
        model = SectionRecord
        fields = (
            "slug",
            "kind",
            "is_read",
            "is_favorite",
            "title",
            "course_slug",
            "course_title",
            "last_read_at",
            "favorited_at",
            "at",
            "updated_at",
        )

    def get_at(self, obj):
        """前端"最近学习"用毫秒时间戳排序，这里给一个方便使用的数值。"""
        stamp = obj.last_read_at or obj.updated_at
        return int(stamp.timestamp() * 1000) if stamp else None


class ProblemRecordSerializer(serializers.ModelSerializer):
    updated_at_ms = serializers.SerializerMethodField()

    class Meta:
        model = ProblemRecord
        fields = (
            "problem_key",
            "done",
            "wrong",
            "favorite",
            "in_wrong_book",
            "title",
            "section_slug",
            "section_title",
            "course_slug",
            "course_title",
            "problem_type",
            "difficulty",
            "knowledge",
            "tags",
            "updated_at",
            "updated_at_ms",
        )

    def get_updated_at_ms(self, obj):
        return int(obj.updated_at.timestamp() * 1000) if obj.updated_at else None

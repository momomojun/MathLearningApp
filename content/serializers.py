from rest_framework import serializers

from .models import Chapter, Course, Section


class SectionMetaSerializer(serializers.ModelSerializer):
    """小节的目录元信息（不含正文），给左侧目录/章节列表用。"""

    class Meta:
        model = Section
        fields = ("id", "slug", "title", "access", "order")


class ChapterSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = ("id", "kind", "title", "count_label", "order", "sections")

    def get_sections(self, obj):
        queryset = obj.sections.filter(is_published=True).order_by("order", "id")
        return SectionMetaSerializer(queryset, many=True).data


class CourseListSerializer(serializers.ModelSerializer):
    """课程选择卡片用，不含章节明细，只带一个题量提示字段。"""

    exercise_count_label = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "slug",
            "title",
            "subtitle",
            "audience",
            "description",
            "exercise_count_label",
        )

    def get_exercise_count_label(self, obj):
        chapter = (
            obj.chapters.filter(kind=Chapter.KIND_EXERCISE, is_published=True)
            .order_by("order", "id")
            .first()
        )
        return chapter.count_label if chapter else None


class CourseDetailSerializer(serializers.ModelSerializer):
    """课程详情：章节 + 小节元信息（不含正文），进入课程后拉一次。"""

    chapters = serializers.SerializerMethodField()
    exercises = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "slug",
            "title",
            "subtitle",
            "audience",
            "description",
            "chapters",
            "exercises",
        )

    def get_chapters(self, obj):
        queryset = obj.chapters.filter(
            kind=Chapter.KIND_KNOWLEDGE, is_published=True
        ).order_by("order", "id")
        return ChapterSerializer(queryset, many=True).data

    def get_exercises(self, obj):
        queryset = obj.chapters.filter(
            kind=Chapter.KIND_EXERCISE, is_published=True
        ).order_by("order", "id")
        return ChapterSerializer(queryset, many=True).data


class SectionContentSerializer(serializers.ModelSerializer):
    """单个小节的正文，点开知识点时才按需拉取。"""

    class Meta:
        model = Section
        fields = ("id", "slug", "title", "content")

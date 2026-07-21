from django.contrib import admin

from .models import ProblemRecord, SectionRecord


@admin.register(SectionRecord)
class SectionRecordAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "slug",
        "kind",
        "is_read",
        "is_favorite",
        "last_read_at",
        "updated_at",
    )
    list_filter = ("kind", "is_read", "is_favorite")
    search_fields = ("user__username", "slug", "title", "course_title")
    raw_id_fields = ("user",)
    ordering = ("-updated_at",)


@admin.register(ProblemRecord)
class ProblemRecordAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "problem_key",
        "done",
        "wrong",
        "favorite",
        "in_wrong_book",
        "updated_at",
    )
    list_filter = ("done", "wrong", "favorite", "in_wrong_book", "difficulty")
    search_fields = ("user__username", "problem_key", "title", "section_title")
    raw_id_fields = ("user",)
    ordering = ("-updated_at",)

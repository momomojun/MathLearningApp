from django import forms
from django.contrib import admin
from django.db import models

from .models import Chapter, Course, Section

CONTENT_TEXTAREA = forms.Textarea(
    attrs={"rows": 26, "style": "font-family: monospace; width: 100%;"}
)


class SectionInline(admin.StackedInline):
    model = Section
    extra = 0
    fields = ("slug", "title", "access", "order", "is_published", "content")
    show_change_link = True
    formfield_overrides = {models.TextField: {"widget": CONTENT_TEXTAREA}}


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 0
    fields = ("kind", "title", "count_label", "order", "is_published")
    show_change_link = True


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "order", "is_published", "updated_at")
    list_editable = ("order", "is_published")
    search_fields = ("title", "slug")
    inlines = [ChapterInline]


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "kind", "count_label", "order", "is_published")
    list_filter = ("course", "kind", "is_published")
    search_fields = ("title",)
    inlines = [SectionInline]


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("title", "chapter", "access", "order", "is_published", "updated_at")
    list_filter = ("chapter__course", "chapter__kind", "access", "is_published")
    search_fields = ("title", "slug", "content")
    formfield_overrides = {models.TextField: {"widget": CONTENT_TEXTAREA}}
    fields = (
        "chapter",
        "slug",
        "title",
        "access",
        "order",
        "is_published",
        "content",
    )

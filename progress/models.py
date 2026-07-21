from django.conf import settings
from django.db import models


class SectionRecord(models.Model):
    """一名用户对一个"小节"（知识库/习题库通用）的学习状态。

    一行对应 (user, slug)：既保存"已读""收藏"两个布尔状态，也保存
    最近一次学习时间，用来在个人中心生成"最近学习"列表。

    删除类操作（取消收藏、清空历史）不做物理删除，而是把对应布尔置为
    False、把 last_read_at 置空，这样状态本身也能被同步到其它设备，
    避免"某台设备取消了收藏、另一台却还留着"。
    """

    KIND_KNOWLEDGE = "knowledge"
    KIND_EXERCISE = "exercise"
    KIND_CHOICES = (
        (KIND_KNOWLEDGE, "知识库"),
        (KIND_EXERCISE, "习题库"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="section_records",
        verbose_name="用户",
    )
    slug = models.SlugField("小节标识", max_length=100)
    kind = models.CharField("类型", max_length=16, choices=KIND_CHOICES, default=KIND_KNOWLEDGE)

    is_read = models.BooleanField("已读", default=False)
    is_favorite = models.BooleanField("已收藏", default=False)
    last_read_at = models.DateTimeField("最近学习时间", null=True, blank=True)
    favorited_at = models.DateTimeField("收藏时间", null=True, blank=True)

    # 冗余展示信息：即便对应小节被下线/改名，个人中心也能显示历史标题并尝试跳转。
    title = models.CharField("小节标题", max_length=120, blank=True)
    course_slug = models.SlugField("所属课程标识", max_length=64, blank=True)
    course_title = models.CharField("所属课程名称", max_length=120, blank=True)

    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "小节学习记录"
        verbose_name_plural = "小节学习记录"
        constraints = [
            models.UniqueConstraint(fields=["user", "slug"], name="uniq_user_section"),
        ]
        indexes = [
            models.Index(fields=["user", "is_favorite"]),
            models.Index(fields=["user", "last_read_at"]),
        ]
        ordering = ["-last_read_at", "-updated_at"]

    def __str__(self):
        return f"{self.user_id}:{self.slug}"


class ProblemRecord(models.Model):
    """一名用户对一道题的做题状态：做过 / 做错 / 收藏 / 加入错题本。

    problem_key 由前端生成，形如 "<sectionSlug>:<题目id>"，全局唯一到用户级别。
    同样不做物理删除，取消收藏 / 移出错题本只是把布尔置 False。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="problem_records",
        verbose_name="用户",
    )
    problem_key = models.CharField("题目标识", max_length=160)

    done = models.BooleanField("已做", default=False)
    wrong = models.BooleanField("做错", default=False)
    favorite = models.BooleanField("已收藏", default=False)
    in_wrong_book = models.BooleanField("在错题本", default=False)

    # 冗余展示信息，供错题本/收藏列表直接渲染与跳转。
    title = models.CharField("题目标题", max_length=160, blank=True)
    section_slug = models.SlugField("所属小节标识", max_length=100, blank=True)
    section_title = models.CharField("所属小节标题", max_length=120, blank=True)
    course_slug = models.SlugField("所属课程标识", max_length=64, blank=True)
    course_title = models.CharField("所属课程名称", max_length=120, blank=True)
    problem_type = models.CharField("题型", max_length=32, blank=True)
    difficulty = models.CharField("难度", max_length=32, blank=True)
    knowledge = models.JSONField("知识点", default=list, blank=True)
    tags = models.JSONField("标签", default=list, blank=True)

    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "做题记录"
        verbose_name_plural = "做题记录"
        constraints = [
            models.UniqueConstraint(fields=["user", "problem_key"], name="uniq_user_problem"),
        ]
        indexes = [
            models.Index(fields=["user", "in_wrong_book"]),
            models.Index(fields=["user", "favorite"]),
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user_id}:{self.problem_key}"

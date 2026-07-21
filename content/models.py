from django.db import models


class Course(models.Model):
    """一门课程，例如"微积分"。对应前端知识库/习题库的课程选择卡片。"""

    slug = models.SlugField("课程标识", max_length=64, unique=True, help_text="用于接口地址，例如 calculus")
    title = models.CharField("课程名称", max_length=100)
    subtitle = models.CharField("副标题", max_length=200, blank=True)
    audience = models.CharField("适合人群", max_length=200, blank=True)
    description = models.TextField("课程简介", blank=True)
    order = models.PositiveIntegerField("排序", default=0, help_text="数字越小越靠前")
    is_published = models.BooleanField("是否上线", default=True, help_text="关闭后前台看不到这门课")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "课程"
        verbose_name_plural = "课程"
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class Chapter(models.Model):
    """课程下的一章。kind 区分这一章属于知识库还是习题库。"""

    KIND_KNOWLEDGE = "knowledge"
    KIND_EXERCISE = "exercise"
    KIND_CHOICES = (
        (KIND_KNOWLEDGE, "知识库"),
        (KIND_EXERCISE, "习题库"),
    )

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="chapters", verbose_name="所属课程"
    )
    kind = models.CharField("类型", max_length=16, choices=KIND_CHOICES, default=KIND_KNOWLEDGE)
    title = models.CharField("章节名称", max_length=100)
    count_label = models.CharField(
        "题量说明", max_length=50, blank=True, help_text="仅习题库用，例如“86 题”，知识库留空即可"
    )
    order = models.PositiveIntegerField("排序", default=0, help_text="数字越小越靠前")
    is_published = models.BooleanField("是否上线", default=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "章"
        verbose_name_plural = "章"
        ordering = ["course_id", "kind", "order", "id"]

    def __str__(self):
        return f"{self.course.title} · {self.title}"


class Section(models.Model):
    """章下面的一个小节，是实际的知识点/习题组正文所在的最小单元。"""

    ACCESS_FREE = "free"
    ACCESS_MEMBER = "member"
    ACCESS_CHOICES = (
        (ACCESS_FREE, "免费"),
        (ACCESS_MEMBER, "会员"),
    )

    chapter = models.ForeignKey(
        Chapter, on_delete=models.CASCADE, related_name="sections", verbose_name="所属章节"
    )
    slug = models.SlugField(
        "小节标识", max_length=100, unique=True, help_text="全站唯一，建议加课程前缀，例如 calculus-limits-sequence"
    )
    title = models.CharField("小节标题", max_length=100)
    access = models.CharField("访问权限", max_length=16, choices=ACCESS_CHOICES, default=ACCESS_FREE)
    content = models.TextField(
        "正文（模板指令）",
        blank=True,
        help_text="用 @chapter/@section/@text/@def/@problem/@solution 等指令写讲义或题目，写法见 docs/TEMPLATE_GUIDE.md",
    )
    order = models.PositiveIntegerField("排序", default=0, help_text="数字越小越靠前")
    is_published = models.BooleanField("是否上线", default=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "小节"
        verbose_name_plural = "小节"
        ordering = ["chapter_id", "order", "id"]

    def __str__(self):
        return f"{self.chapter} · {self.title}"

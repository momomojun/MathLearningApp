"""把示例课程内容导入数据库。

用法：

    python manage.py seed_demo_content

导入微积分 / 线性代数 / 概率统计共 3 门课、7 个小节的示例内容
（正文取自 content/seed_content/ 下的 .math.md 文件）。
可以重复执行，按 slug 做 update_or_create，不会重复创建。
"""

from pathlib import Path

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction

from content.models import Chapter, Course, Section

SEED_DIR = Path(apps.get_app_config("content").path) / "seed_content"


def read_content(relative_path):
    return (SEED_DIR / relative_path).read_text(encoding="utf-8")


COURSES = [
    {
        "slug": "calculus",
        "title": "微积分",
        "subtitle": "极限、导数、积分与级数",
        "audience": "期末备考 / 考研数学 / 工科基础",
        "description": "从极限语言进入连续、导数和积分，强调计算、证明和应用题之间的衔接。",
        "order": 1,
        "chapters": [
            {
                "kind": Chapter.KIND_KNOWLEDGE,
                "title": "第一章 极限与连续",
                "order": 1,
                "sections": [
                    {
                        "slug": "calculus-limits-sequence",
                        "title": "数列极限",
                        "access": Section.ACCESS_FREE,
                        "order": 1,
                        "content_file": "calculus/limits-sequence.math.md",
                    },
                    {
                        "slug": "calculus-limits-function",
                        "title": "函数极限",
                        "access": Section.ACCESS_MEMBER,
                        "order": 2,
                        "content_file": "calculus/limits-function.math.md",
                    },
                ],
            },
        ],
        "exercise_chapters": [
            {
                "kind": Chapter.KIND_EXERCISE,
                "title": "极限与连续专题训练",
                "count_label": "86 题",
                "order": 1,
                "sections": [
                    {
                        "slug": "calculus-exercises-limit-basic",
                        "title": "基础极限计算",
                        "access": Section.ACCESS_MEMBER,
                        "order": 1,
                        "content_file": "calculus/exercises-limit-basic.math.md",
                    },
                ],
            },
        ],
    },
    {
        "slug": "linear-algebra",
        "title": "线性代数",
        "subtitle": "行列式、矩阵、向量空间与特征值",
        "audience": "期末备考 / 考研数学 / 数据科学基础",
        "description": "用矩阵语言组织线性方程组、空间结构和线性变换。",
        "order": 2,
        "chapters": [
            {
                "kind": Chapter.KIND_KNOWLEDGE,
                "title": "第一章 行列式",
                "order": 1,
                "sections": [
                    {
                        "slug": "linear-algebra-determinant-basic",
                        "title": "二阶与三阶行列式",
                        "access": Section.ACCESS_FREE,
                        "order": 1,
                        "content_file": "linear-algebra/determinant-basic.math.md",
                    },
                ],
            },
        ],
        "exercise_chapters": [
            {
                "kind": Chapter.KIND_EXERCISE,
                "title": "矩阵初等变换题组",
                "count_label": "72 题",
                "order": 1,
                "sections": [
                    {
                        "slug": "linear-algebra-matrix-row-reduction",
                        "title": "初等行变换",
                        "access": Section.ACCESS_MEMBER,
                        "order": 1,
                        "content_file": "linear-algebra/matrix-row-reduction.math.md",
                    },
                ],
            },
        ],
    },
    {
        "slug": "probability",
        "title": "概率统计",
        "subtitle": "随机事件、随机变量、估计与检验",
        "audience": "期末备考 / 考研数学 / 商科与数据分析",
        "description": "从概率模型到统计推断，建立事件、分布、样本和结论之间的逻辑链条。",
        "order": 3,
        "chapters": [
            {
                "kind": Chapter.KIND_KNOWLEDGE,
                "title": "第一章 随机事件",
                "order": 1,
                "sections": [
                    {
                        "slug": "probability-conditional-probability",
                        "title": "条件概率",
                        "access": Section.ACCESS_FREE,
                        "order": 1,
                        "content_file": "probability/conditional-probability.math.md",
                    },
                ],
            },
        ],
        "exercise_chapters": [
            {
                "kind": Chapter.KIND_EXERCISE,
                "title": "条件概率与贝叶斯公式",
                "count_label": "64 题",
                "order": 1,
                "sections": [
                    {
                        "slug": "probability-bayes-practice",
                        "title": "贝叶斯公式训练",
                        "access": Section.ACCESS_MEMBER,
                        "order": 1,
                        "content_file": "probability/bayes-practice.math.md",
                    },
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "导入示例课程内容（微积分/线性代数/概率统计共 7 个小节），可重复执行。"

    @transaction.atomic
    def handle(self, *args, **options):
        for course_data in COURSES:
            course = self._sync_course(course_data)
            self._sync_chapters(course, course_data.get("chapters", []))
            self._sync_chapters(course, course_data.get("exercise_chapters", []))
        self.stdout.write(self.style.SUCCESS("示例内容导入完成"))

    def _sync_course(self, course_data):
        defaults = {
            "title": course_data["title"],
            "subtitle": course_data.get("subtitle", ""),
            "audience": course_data.get("audience", ""),
            "description": course_data.get("description", ""),
            "order": course_data.get("order", 0),
        }
        course, _ = Course.objects.update_or_create(slug=course_data["slug"], defaults=defaults)
        return course

    def _sync_chapters(self, course, chapters_data):
        for chapter_data in chapters_data:
            defaults = {
                "count_label": chapter_data.get("count_label", ""),
                "order": chapter_data.get("order", 0),
            }
            chapter, _ = Chapter.objects.update_or_create(
                course=course,
                kind=chapter_data["kind"],
                title=chapter_data["title"],
                defaults=defaults,
            )
            for section_data in chapter_data.get("sections", []):
                self._sync_section(chapter, section_data)

    def _sync_section(self, chapter, section_data):
        defaults = {
            "title": section_data["title"],
            "access": section_data.get("access", Section.ACCESS_FREE),
            "order": section_data.get("order", 0),
            "content": read_content(section_data["content_file"]),
        }
        Section.objects.update_or_create(
            chapter=chapter, slug=section_data["slug"], defaults=defaults
        )

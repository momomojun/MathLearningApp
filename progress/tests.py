from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ProblemRecord, SectionRecord
from .services import merge_snapshot, upsert_problem, upsert_section


class ProgressServiceTests(APITestCase):
    """直接测试 services 里的合并/写入规则。"""

    def setUp(self):
        self.user = get_user_model().objects.create_user("stu", password="pw12345678")

    def test_upsert_section_mark_recent_sets_read_and_time(self):
        record = upsert_section(
            self.user,
            {"slug": "calc-limit", "mark_recent": True, "title": "极限", "kind": "knowledge"},
        )
        self.assertTrue(record.is_read)
        self.assertIsNotNone(record.last_read_at)
        self.assertEqual(record.title, "极限")

    def test_upsert_section_toggle_favorite_off_clears_time(self):
        upsert_section(self.user, {"slug": "s1", "is_favorite": True})
        record = SectionRecord.objects.get(user=self.user, slug="s1")
        self.assertTrue(record.is_favorite)
        self.assertIsNotNone(record.favorited_at)

        upsert_section(self.user, {"slug": "s1", "is_favorite": False})
        record.refresh_from_db()
        self.assertFalse(record.is_favorite)
        self.assertIsNone(record.favorited_at)

    def test_upsert_section_does_not_wipe_meta_with_blank(self):
        upsert_section(self.user, {"slug": "s1", "title": "标题A", "is_favorite": True})
        # 后续操作没带 title，不应把已保存的标题清掉
        upsert_section(self.user, {"slug": "s1", "is_read": True})
        record = SectionRecord.objects.get(user=self.user, slug="s1")
        self.assertEqual(record.title, "标题A")

    def test_upsert_problem_flags(self):
        record = upsert_problem(
            self.user,
            {"problem_key": "s1:1", "wrong": True, "in_wrong_book": True, "done": True},
        )
        self.assertTrue(record.done and record.wrong and record.in_wrong_book)

    def test_merge_union_booleans(self):
        # 服务端已有：收藏=True，已读=False
        upsert_section(self.user, {"slug": "s1", "is_favorite": True})
        # 本地带来：已读=True，收藏=False —— 并集后两者都为 True
        merge_snapshot(
            self.user,
            sections=[{"slug": "s1", "is_read": True, "is_favorite": False}],
        )
        record = SectionRecord.objects.get(user=self.user, slug="s1")
        self.assertTrue(record.is_read)
        self.assertTrue(record.is_favorite)

    def test_merge_recent_takes_newer_time(self):
        older = timezone.now() - timezone.timedelta(days=2)
        upsert_section(self.user, {"slug": "s1", "mark_recent": True})
        SectionRecord.objects.filter(user=self.user, slug="s1").update(last_read_at=older)
        newer_ms = int((timezone.now().timestamp()) * 1000)
        merge_snapshot(self.user, sections=[{"slug": "s1", "last_read_at_ms": newer_ms}])
        record = SectionRecord.objects.get(user=self.user, slug="s1")
        self.assertGreater(record.last_read_at, older)

    def test_merge_problem_union(self):
        upsert_problem(self.user, {"problem_key": "s1:1", "favorite": True})
        merge_snapshot(self.user, problems=[{"problem_key": "s1:1", "in_wrong_book": True, "wrong": True}])
        record = ProblemRecord.objects.get(user=self.user, problem_key="s1:1")
        self.assertTrue(record.favorite and record.in_wrong_book and record.wrong)


class ProgressApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("stu", password="pw12345678")
        self.other = User.objects.create_user("stu2", password="pw12345678")

    def test_requires_auth(self):
        self.assertEqual(self.client.get("/api/progress/").status_code, 401)

    def test_snapshot_after_section_upsert(self):
        self.client.force_authenticate(self.user)
        self.client.post(
            "/api/progress/sections/",
            {"slug": "s1", "mark_recent": True, "title": "极限", "course_slug": "calc"},
            format="json",
        )
        self.client.post("/api/progress/sections/", {"slug": "s2", "is_favorite": True}, format="json")
        resp = self.client.get("/api/progress/")
        self.assertEqual(resp.status_code, 200)
        slugs = {row["slug"] for row in resp.data["sections"]}
        self.assertEqual(slugs, {"s1", "s2"})

    def test_clear_history_keeps_favorites(self):
        self.client.force_authenticate(self.user)
        self.client.post("/api/progress/sections/", {"slug": "s1", "mark_recent": True}, format="json")
        self.client.post("/api/progress/sections/", {"slug": "s1", "is_favorite": True}, format="json")
        self.client.post("/api/progress/sections/clear-history/", {}, format="json")
        record = SectionRecord.objects.get(user=self.user, slug="s1")
        self.assertFalse(record.is_read)
        self.assertIsNone(record.last_read_at)
        self.assertTrue(record.is_favorite)  # 收藏保留

    def test_problem_upsert_and_snapshot(self):
        self.client.force_authenticate(self.user)
        self.client.post(
            "/api/progress/problems/",
            {"problem_key": "s1:1", "wrong": True, "in_wrong_book": True, "title": "题1"},
            format="json",
        )
        resp = self.client.get("/api/progress/")
        self.assertEqual(len(resp.data["problems"]), 1)
        self.assertTrue(resp.data["problems"][0]["in_wrong_book"])

    def test_merge_endpoint_returns_snapshot(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            "/api/progress/merge/",
            {
                "sections": [{"slug": "s1", "is_favorite": True, "title": "极限"}],
                "problems": [{"problem_key": "s1:1", "in_wrong_book": True}],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["merged"], {"sections": 1, "problems": 1})
        self.assertEqual(len(resp.data["sections"]), 1)
        self.assertEqual(len(resp.data["problems"]), 1)

    def test_records_are_user_scoped(self):
        self.client.force_authenticate(self.user)
        self.client.post("/api/progress/sections/", {"slug": "s1", "is_favorite": True}, format="json")
        self.client.force_authenticate(self.other)
        resp = self.client.get("/api/progress/")
        self.assertEqual(resp.data["sections"], [])

    def test_missing_slug_is_400(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post("/api/progress/sections/", {"is_read": True}, format="json")
        self.assertEqual(resp.status_code, 400)

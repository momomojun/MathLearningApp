"""进度同步的核心业务逻辑。

把"如何写库""如何合并"从视图里抽出来，方便单元测试直接调用，也方便
以后换成别的入口（例如管理命令、定时任务）复用同一套规则。

合并规则（对应 P1-1 的冲突约定）：
- 布尔状态取并集：任意一端为真则结果为真（做过、做错、收藏、错题本、已读）。
- 最近学习按时间取较新的一次。
- 取消收藏 / 移出错题本 / 清空历史都表示为布尔置 False，本身也是可同步的状态，
  不做物理删除，避免删除动作在多设备间丢失。
"""

from django.utils import timezone

from .models import ProblemRecord, SectionRecord

# 传入 upsert 的可选展示字段，只有在客户端给了非空值时才覆盖，避免把历史标题清掉。
_SECTION_META_FIELDS = ("title", "course_slug", "course_title")
_PROBLEM_META_FIELDS = (
    "title",
    "section_slug",
    "section_title",
    "course_slug",
    "course_title",
    "problem_type",
    "difficulty",
)
_PROBLEM_LIST_FIELDS = ("knowledge", "tags")


def _ms_to_dt(value):
    """把前端的毫秒时间戳转成带时区的 datetime；无效值返回 None。"""
    try:
        if value in (None, ""):
            return None
        seconds = float(value) / 1000.0
    except (TypeError, ValueError):
        return None
    return timezone.datetime.fromtimestamp(seconds, tz=timezone.get_current_timezone())


def _apply_section_meta(record, data):
    for field in _SECTION_META_FIELDS:
        value = data.get(field)
        if value:
            setattr(record, field, value)
    kind = data.get("kind")
    if kind in (SectionRecord.KIND_KNOWLEDGE, SectionRecord.KIND_EXERCISE):
        record.kind = kind


def upsert_section(user, data):
    """单条小节 upsert：用于"标记已读""切换收藏"等即时操作。

    只处理 data 中出现的字段；mark_recent=True 时刷新最近学习时间。
    """
    slug = (data.get("slug") or "").strip()
    if not slug:
        raise ValueError("slug 不能为空")

    record, _ = SectionRecord.objects.get_or_create(user=user, slug=slug)
    _apply_section_meta(record, data)

    if "is_read" in data:
        record.is_read = bool(data["is_read"])

    if data.get("mark_recent"):
        record.is_read = True
        record.last_read_at = timezone.now()

    if "is_favorite" in data:
        favorite = bool(data["is_favorite"])
        record.is_favorite = favorite
        if favorite and not record.favorited_at:
            record.favorited_at = timezone.now()
        if not favorite:
            record.favorited_at = None

    record.save()
    return record


def clear_section_history(user):
    """清空"已读"和"最近学习"，但保留收藏（与前端 clearHistory 行为一致）。"""
    SectionRecord.objects.filter(user=user).update(is_read=False, last_read_at=None)


def _apply_problem_meta(record, data):
    for field in _PROBLEM_META_FIELDS:
        value = data.get(field)
        if value:
            setattr(record, field, value)
    for field in _PROBLEM_LIST_FIELDS:
        value = data.get(field)
        if isinstance(value, list) and value:
            setattr(record, field, value)


def upsert_problem(user, data):
    """单条做题记录 upsert：做过 / 做错 / 收藏 / 错题本。"""
    problem_key = (data.get("problem_key") or "").strip()
    if not problem_key:
        raise ValueError("problem_key 不能为空")

    record, _ = ProblemRecord.objects.get_or_create(user=user, problem_key=problem_key)
    _apply_problem_meta(record, data)

    for field in ("done", "wrong", "favorite", "in_wrong_book"):
        if field in data:
            setattr(record, field, bool(data[field]))

    record.save()
    return record


def merge_section(user, item):
    """首登合并：布尔取并集，最近学习/收藏时间取较新的一次。"""
    slug = (item.get("slug") or "").strip()
    if not slug:
        return None

    record, _ = SectionRecord.objects.get_or_create(user=user, slug=slug)
    _apply_section_meta(record, item)

    record.is_read = record.is_read or bool(item.get("is_read"))
    incoming_fav = bool(item.get("is_favorite"))
    record.is_favorite = record.is_favorite or incoming_fav

    incoming_last = _ms_to_dt(item.get("last_read_at_ms") or item.get("at"))
    if incoming_last and (record.last_read_at is None or incoming_last > record.last_read_at):
        record.last_read_at = incoming_last

    incoming_fav_at = _ms_to_dt(item.get("favorited_at_ms"))
    if record.is_favorite and record.favorited_at is None:
        record.favorited_at = incoming_fav_at or timezone.now()

    record.save()
    return record


def merge_problem(user, item):
    problem_key = (item.get("problem_key") or "").strip()
    if not problem_key:
        return None

    record, _ = ProblemRecord.objects.get_or_create(user=user, problem_key=problem_key)
    _apply_problem_meta(record, item)

    for field in ("done", "wrong", "favorite", "in_wrong_book"):
        setattr(record, field, getattr(record, field) or bool(item.get(field)))

    record.save()
    return record


def merge_snapshot(user, sections=None, problems=None):
    """把一批本地记录合并进服务端。返回合并后受影响的记录数量。"""
    section_count = 0
    for item in sections or []:
        if isinstance(item, dict) and merge_section(user, item):
            section_count += 1

    problem_count = 0
    for item in problems or []:
        if isinstance(item, dict) and merge_problem(user, item):
            problem_count += 1

    return {"sections": section_count, "problems": problem_count}

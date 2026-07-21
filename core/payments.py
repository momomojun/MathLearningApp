import hashlib
import json
import uuid
from decimal import Decimal
from urllib import parse, request

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import PaymentOrder, UserProfile


MEMBERSHIP_PLANS = {
    "monthly": {
        "name": "月度会员",
        "amount": Decimal("39.00"),
        "days": 30,
    },
    "yearly": {
        "name": "年度会员",
        "amount": Decimal("199.00"),
        "days": 365,
    },
}


class PaymentError(Exception):
    pass


def build_order_no():
    return f"MA{timezone.now():%Y%m%d%H%M%S}{uuid.uuid4().hex[:10].upper()}"


def create_membership_order(user, plan_code):
    plan = MEMBERSHIP_PLANS.get(plan_code)
    if not plan:
        raise PaymentError("未知会员套餐")

    order = PaymentOrder.objects.create(
        user=user,
        order_no=build_order_no(),
        plan_code=plan_code,
        plan_name=plan["name"],
        amount=plan["amount"],
        membership_days=plan["days"],
        provider=settings.PAYMENT_PROVIDER,
    )

    payment = create_provider_payment(order)
    return order, payment


def create_provider_payment(order):
    if settings.PAYMENT_PROVIDER == "mock":
        return {
            "pay_url": f"{settings.PUBLIC_BASE_URL}/api/payments/mock-complete/{order.order_no}/",
            "mode": "mock",
        }

    if not settings.PAYMENT_CREATE_URL:
        raise PaymentError("请先配置 PAYMENT_CREATE_URL")

    payload = {
        "merchant_id": settings.PAYMENT_MERCHANT_ID,
        "out_trade_no": order.order_no,
        "name": order.plan_name,
        "amount": str(order.amount),
        "notify_url": f"{settings.PUBLIC_BASE_URL}/api/payments/notify/",
        "return_url": f"{settings.FRONTEND_BASE_URL}/membership?order={order.order_no}",
    }
    payload["sign"] = sign_payload(payload)

    data = parse.urlencode(payload).encode("utf-8")
    req = request.Request(settings.PAYMENT_CREATE_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with request.urlopen(req, timeout=15) as response:
            body = response.read().decode("utf-8")
    except Exception as exc:
        raise PaymentError(f"创建支付订单失败：{exc}") from exc

    try:
        result = json.loads(body)
    except json.JSONDecodeError as exc:
        raise PaymentError(f"支付平台返回了非 JSON 内容：{body[:200]}") from exc

    pay_url = (
        result.get("pay_url")
        or result.get("url")
        or result.get("qrcode")
        or result.get("data", {}).get("pay_url")
        or result.get("data", {}).get("url")
        or result.get("data", {}).get("qrcode")
    )
    if not pay_url:
        raise PaymentError(f"支付平台未返回支付地址：{result}")

    return {"pay_url": pay_url, "mode": settings.PAYMENT_PROVIDER}


def sign_payload(payload):
    if not settings.PAYMENT_SECRET_KEY:
        return ""

    pairs = []
    for key in sorted(payload):
        value = payload[key]
        if key == "sign" or value in (None, ""):
            continue
        pairs.append(f"{key}={value}")
    pairs.append(f"key={settings.PAYMENT_SECRET_KEY}")
    return hashlib.md5("&".join(pairs).encode("utf-8")).hexdigest()


def verify_notify_signature(payload):
    if not settings.PAYMENT_SECRET_KEY:
        return True

    incoming = payload.get("sign", "")
    expected = sign_payload(payload)
    return incoming.lower() == expected.lower()


def notify_is_paid(payload):
    status = str(
        payload.get("status")
        or payload.get("trade_status")
        or payload.get("state")
        or payload.get("result")
        or ""
    ).lower()
    return status in {"paid", "success", "trade_success", "pay_success", "1", "ok"}


@transaction.atomic
def mark_order_paid(order, payload=None):
    locked = PaymentOrder.objects.select_for_update().get(pk=order.pk)
    if locked.status == PaymentOrder.STATUS_PAID:
        return locked

    locked.status = PaymentOrder.STATUS_PAID
    locked.provider_trade_no = str(
        (payload or {}).get("trade_no")
        or (payload or {}).get("transaction_id")
        or (payload or {}).get("provider_trade_no")
        or ""
    )
    locked.raw_notify = payload or {}
    locked.paid_at = timezone.now()
    locked.save(update_fields=["status", "provider_trade_no", "raw_notify", "paid_at", "updated_at"])

    profile, _ = UserProfile.objects.get_or_create(user=locked.user)
    profile.is_member = True
    profile.membership_days_remaining += locked.membership_days
    profile.save(update_fields=["is_member", "membership_days_remaining", "updated_at"])

    return locked

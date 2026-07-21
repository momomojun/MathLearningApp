from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="用户账号",
    )
    nickname = models.CharField("昵称", max_length=50, blank=True)
    organization = models.CharField("机构", max_length=100, blank=True)
    is_member = models.BooleanField("是否为会员", default=False)
    membership_days_remaining = models.PositiveIntegerField("会员剩余订阅时长/天", default=0)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "用户资料"
        verbose_name_plural = "用户资料"

    def __str__(self):
        return self.nickname or self.user.username


class PaymentOrder(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_FAILED = "failed"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CLOSED, "Closed"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_orders",
    )
    order_no = models.CharField(max_length=64, unique=True)
    plan_code = models.CharField(max_length=32)
    plan_name = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    membership_days = models.PositiveIntegerField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    provider = models.CharField(max_length=32, blank=True)
    provider_trade_no = models.CharField(max_length=128, blank=True)
    raw_notify = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_no

from django.core.management.base import BaseCommand

from core.models import UserProfile


class Command(BaseCommand):
    help = (
        "把所有会员的剩余天数减一；剩余天数减到 0 的账号自动取消会员资格。"
        "建议每天用系统计划任务调用一次。"
    )

    def handle(self, *args, **options):
        members = UserProfile.objects.filter(is_member=True)
        processed = 0
        expired = 0

        for profile in members:
            if profile.membership_days_remaining > 0:
                profile.membership_days_remaining -= 1

            if profile.membership_days_remaining <= 0:
                profile.membership_days_remaining = 0
                profile.is_member = False
                expired += 1

            profile.save(update_fields=["membership_days_remaining", "is_member"])
            processed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"已处理会员 {processed} 人，其中 {expired} 人到期并自动取消会员资格。"
            )
        )

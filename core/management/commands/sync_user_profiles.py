from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import UserProfile


class Command(BaseCommand):
    help = "Sync UserProfile rows with the Django auth user table."

    def handle(self, *args, **options):
        User = get_user_model()
        valid_user_ids = set(User.objects.values_list("id", flat=True))
        orphan_profiles = UserProfile.objects.exclude(user_id__in=valid_user_ids)
        orphan_count = orphan_profiles.count()
        orphan_profiles.delete()

        created_count = 0
        for user in User.objects.all():
            _, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={"nickname": user.first_name or user.username},
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Synced user profiles. Deleted orphan profiles: {orphan_count}. "
                f"Created missing profiles: {created_count}."
            )
        )

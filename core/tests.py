from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from .models import UserProfile


class ExpireMembershipsCommandTests(TestCase):
    def make_user(self, username, is_member, days_remaining):
        user = get_user_model().objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="testpass123",
        )
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.is_member = is_member
        profile.membership_days_remaining = days_remaining
        profile.save()
        return profile

    def test_decrements_days_for_active_member(self):
        profile = self.make_user("member_a", is_member=True, days_remaining=5)

        call_command("expire_memberships")

        profile.refresh_from_db()
        self.assertEqual(profile.membership_days_remaining, 4)
        self.assertTrue(profile.is_member)

    def test_member_expires_when_last_day_used(self):
        profile = self.make_user("member_b", is_member=True, days_remaining=1)

        call_command("expire_memberships")

        profile.refresh_from_db()
        self.assertEqual(profile.membership_days_remaining, 0)
        self.assertFalse(profile.is_member)

    def test_member_already_at_zero_days_gets_demoted(self):
        profile = self.make_user("member_c", is_member=True, days_remaining=0)

        call_command("expire_memberships")

        profile.refresh_from_db()
        self.assertEqual(profile.membership_days_remaining, 0)
        self.assertFalse(profile.is_member)

    def test_non_member_untouched(self):
        profile = self.make_user("guest_a", is_member=False, days_remaining=30)

        call_command("expire_memberships")

        profile.refresh_from_db()
        self.assertEqual(profile.membership_days_remaining, 30)
        self.assertFalse(profile.is_member)

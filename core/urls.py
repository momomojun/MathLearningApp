from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api import UserViewSet
from .auth_views import LoginView, LogoutView, MeView
from .payment_views import (
    MembershipOrderView,
    MockPaymentCompleteView,
    PaymentNotifyView,
    PaymentOrderStatusView,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("payments/membership-orders/", MembershipOrderView.as_view(), name="membership-order"),
    path("payments/orders/<str:order_no>/", PaymentOrderStatusView.as_view(), name="payment-order-status"),
    path("payments/notify/", PaymentNotifyView.as_view(), name="payment-notify"),
    path("payments/mock-complete/<str:order_no>/", MockPaymentCompleteView.as_view(), name="payment-mock-complete"),
]

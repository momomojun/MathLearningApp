from django.conf import settings
from django.shortcuts import redirect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PaymentOrder
from .payments import (
    PaymentError,
    create_membership_order,
    mark_order_paid,
    notify_is_paid,
    verify_notify_signature,
)


class MembershipOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_code = request.data.get("plan_code")
        try:
            order, payment = create_membership_order(request.user, plan_code)
        except PaymentError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "order_no": order.order_no,
                "status": order.status,
                "plan_name": order.plan_name,
                "amount": str(order.amount),
                "membership_days": order.membership_days,
                "pay_url": payment["pay_url"],
                "mode": payment["mode"],
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentOrderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_no):
        try:
            order = PaymentOrder.objects.get(order_no=order_no, user=request.user)
        except PaymentOrder.DoesNotExist:
            return Response({"detail": "订单不存在"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "order_no": order.order_no,
                "status": order.status,
                "plan_name": order.plan_name,
                "amount": str(order.amount),
                "membership_days": order.membership_days,
            }
        )


class PaymentNotifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.data.copy()
        order_no = payload.get("out_trade_no") or payload.get("order_no")

        if not order_no:
            return Response("missing order", status=status.HTTP_400_BAD_REQUEST)
        if not verify_notify_signature(payload):
            return Response("bad sign", status=status.HTTP_400_BAD_REQUEST)

        try:
            order = PaymentOrder.objects.get(order_no=order_no)
        except PaymentOrder.DoesNotExist:
            return Response("order not found", status=status.HTTP_404_NOT_FOUND)

        if notify_is_paid(payload):
            mark_order_paid(order, payload)

        return Response("success")


class MockPaymentCompleteView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, order_no):
        if settings.PAYMENT_PROVIDER != "mock" or not settings.DEBUG:
            return Response({"detail": "Mock payment is disabled."}, status=status.HTTP_404_NOT_FOUND)

        try:
            order = PaymentOrder.objects.get(order_no=order_no)
        except PaymentOrder.DoesNotExist:
            return Response({"detail": "订单不存在"}, status=status.HTTP_404_NOT_FOUND)

        mark_order_paid(order, {"order_no": order_no, "status": "paid", "provider": "mock"})
        return redirect(f"{settings.FRONTEND_BASE_URL}/membership?paid=1&order={order_no}")

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api import CourseViewSet, SectionContentView

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")

urlpatterns = [
    path("", include(router.urls)),
    path("sections/<slug:slug>/", SectionContentView.as_view(), name="section-content"),
]

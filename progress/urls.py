from django.urls import path

from .api import (
    ProblemRecordView,
    ProgressMergeView,
    ProgressSnapshotView,
    SectionHistoryClearView,
    SectionRecordView,
)

urlpatterns = [
    path("", ProgressSnapshotView.as_view(), name="progress-snapshot"),
    path("merge/", ProgressMergeView.as_view(), name="progress-merge"),
    path("sections/", SectionRecordView.as_view(), name="progress-section"),
    path("sections/clear-history/", SectionHistoryClearView.as_view(), name="progress-section-clear"),
    path("problems/", ProblemRecordView.as_view(), name="progress-problem"),
]

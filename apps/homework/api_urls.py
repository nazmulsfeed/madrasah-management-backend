from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HomeworkAttachmentViewSet, HomeworkReviewViewSet, HomeworkSubmissionViewSet, HomeworkViewSet

router = DefaultRouter()
router.register("homework", HomeworkViewSet)
router.register("attachments", HomeworkAttachmentViewSet)
router.register("submissions", HomeworkSubmissionViewSet)
router.register("reviews", HomeworkReviewViewSet)

urlpatterns = [path("", include(router.urls))]

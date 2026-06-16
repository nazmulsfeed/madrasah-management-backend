from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Homework, HomeworkAttachment, HomeworkReview, HomeworkSubmission
from .serializers import HomeworkAttachmentSerializer, HomeworkReviewSerializer, HomeworkSerializer, HomeworkSubmissionSerializer
from .services import HomeworkAssignmentService


class HomeworkDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "homework/dashboard.html"


class HomeworkViewSet(ModelViewSet):
    queryset = Homework.objects.select_related("academic_year", "class_level", "section", "subject", "teacher")
    serializer_class = HomeworkSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        return Response(HomeworkSerializer(HomeworkAssignmentService.publish(self.get_object())).data)


class HomeworkAttachmentViewSet(ModelViewSet):
    queryset = HomeworkAttachment.objects.select_related("homework")
    serializer_class = HomeworkAttachmentSerializer
    permission_classes = [IsAuthenticated]


class HomeworkSubmissionViewSet(ModelViewSet):
    queryset = HomeworkSubmission.objects.select_related("homework", "student", "submitted_by")
    serializer_class = HomeworkSubmissionSerializer
    permission_classes = [IsAuthenticated]


class HomeworkReviewViewSet(ModelViewSet):
    queryset = HomeworkReview.objects.select_related("submission", "teacher", "reviewed_by")
    serializer_class = HomeworkReviewSerializer
    permission_classes = [IsAuthenticated]

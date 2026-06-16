from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import FileResponse
from django.views.generic import TemplateView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from .models import Exam, ExamSchedule, ExamSubject, ExamTerm, GradeRule, GradeScale, MarkEntry, Result, Transcript
from .serializers import (
    ExamScheduleSerializer,
    ExamSerializer,
    ExamSubjectSerializer,
    ExamTermSerializer,
    GradeRuleSerializer,
    GradeScaleSerializer,
    MarkEntrySerializer,
    ResultSerializer,
    TranscriptSerializer,
)
from .services import MarkEntryService, MarksheetPDFService, ResultCalculationService, ResultPublishService


class ExamsDashboardView(LoginRequiredMixin, TemplateView):
    template_name = "exams/dashboard.html"


class ExamViewSet(ModelViewSet):
    queryset = Exam.objects.select_related("academic_year", "exam_term", "class_level", "section")
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"], url_path="calculate-results")
    def calculate_results(self, request, pk=None):
        grade_scale = GradeScale.objects.filter(is_default=True).first()
        results = ResultCalculationService.calculate_exam_results(self.get_object(), grade_scale)
        return Response(ResultSerializer(results, many=True).data)

    @action(detail=True, methods=["post"], url_path="publish-results")
    def publish_results(self, request, pk=None):
        exam = ResultPublishService.publish(self.get_object(), request.user)
        return Response(ExamSerializer(exam).data)


class ExamTermViewSet(ModelViewSet):
    queryset = ExamTerm.objects.select_related("academic_year")
    serializer_class = ExamTermSerializer
    permission_classes = [IsAuthenticated]


class ExamSubjectViewSet(ModelViewSet):
    queryset = ExamSubject.objects.select_related("exam", "subject")
    serializer_class = ExamSubjectSerializer
    permission_classes = [IsAuthenticated]


class ExamScheduleViewSet(ModelViewSet):
    queryset = ExamSchedule.objects.select_related("exam_subject", "room")
    serializer_class = ExamScheduleSerializer
    permission_classes = [IsAuthenticated]


class GradeScaleViewSet(ModelViewSet):
    queryset = GradeScale.objects.all()
    serializer_class = GradeScaleSerializer
    permission_classes = [IsAuthenticated]


class GradeRuleViewSet(ModelViewSet):
    queryset = GradeRule.objects.select_related("grade_scale")
    serializer_class = GradeRuleSerializer
    permission_classes = [IsAuthenticated]


class MarkEntryViewSet(ModelViewSet):
    queryset = MarkEntry.objects.select_related("exam", "student", "subject")
    serializer_class = MarkEntrySerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        return Response(MarkEntrySerializer(MarkEntryService.submit(self.get_object(), request.user)).data)


class ResultViewSet(ReadOnlyModelViewSet):
    queryset = Result.objects.select_related("exam", "student").prefetch_related("subjects")
    serializer_class = ResultSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["get"], url_path="marksheet-pdf")
    def marksheet_pdf(self, request, pk=None):
        result = self.get_object()
        pdf = MarksheetPDFService.build_pdf(result)
        return FileResponse(pdf, as_attachment=True, filename=f"marksheet-{result.id}.pdf")


class TranscriptViewSet(ReadOnlyModelViewSet):
    queryset = Transcript.objects.select_related("result", "generated_by")
    serializer_class = TranscriptSerializer
    permission_classes = [IsAuthenticated]

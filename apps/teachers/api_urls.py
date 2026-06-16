from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SubjectViewSet, TeacherClassAssignmentViewSet, TeacherSubjectAssignmentViewSet, TeacherViewSet

router = DefaultRouter()
router.register("teachers", TeacherViewSet, basename="teachers")
router.register("subjects", SubjectViewSet)
router.register("class-assignments", TeacherClassAssignmentViewSet, basename="teacher-class-assignments")
router.register("subject-assignments", TeacherSubjectAssignmentViewSet, basename="teacher-subject-assignments")

urlpatterns = [path("", include(router.urls))]

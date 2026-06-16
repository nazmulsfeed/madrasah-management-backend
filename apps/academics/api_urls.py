from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcademicSessionViewSet,
    AcademicYearViewSet,
    ClassDepartmentViewSet,
    ClassLevelViewSet,
    ClassSubjectViewSet,
    DepartmentViewSet,
    PeriodViewSet,
    RoomViewSet,
    SectionViewSet,
    SubjectViewSet,
    TimetableSlotViewSet,
    TimetableViewSet,
)

router = DefaultRouter()
router.register("academic-years", AcademicYearViewSet)
router.register("sessions", AcademicSessionViewSet)
router.register("classes", ClassLevelViewSet)
router.register("sections", SectionViewSet)
router.register("subjects", SubjectViewSet)
router.register("departments", DepartmentViewSet)
router.register("class-departments", ClassDepartmentViewSet)
router.register("class-subjects", ClassSubjectViewSet)
router.register("rooms", RoomViewSet)
router.register("periods", PeriodViewSet)
router.register("timetables", TimetableViewSet)
router.register("timetable-slots", TimetableSlotViewSet)

urlpatterns = [path("", include(router.urls))]

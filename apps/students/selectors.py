from django.db.models import Q

from .models import Student


def students_for_scope(user):
    queryset = Student.objects.select_related("user", "institution", "branch", "current_enrollment")
    if user.is_superuser:
        return queryset
    if getattr(user, "institution_id", None):
        queryset = queryset.filter(institution=user.institution)
    if getattr(user, "branch_id", None):
        queryset = queryset.filter(branch=user.branch)
    if getattr(user, "user_type", None) == "student":
        queryset = queryset.filter(user=user)
    return queryset


def search_students(user, query):
    queryset = students_for_scope(user)
    if not query:
        return queryset
    return queryset.filter(
        Q(admission_number__icontains=query)
        | Q(student_id__icontains=query)
        | Q(user__first_name__icontains=query)
        | Q(user__last_name__icontains=query)
        | Q(user__phone__icontains=query)
        | Q(user__email__icontains=query)
    )

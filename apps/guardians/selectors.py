from .models import Guardian, StudentGuardian


def guardians_for_scope(user):
    queryset = Guardian.objects.select_related("user", "institution", "branch")
    if user.is_superuser:
        return queryset
    if getattr(user, "user_type", None) == "guardian":
        return queryset.filter(user=user)
    if getattr(user, "institution_id", None):
        queryset = queryset.filter(institution=user.institution)
    if getattr(user, "branch_id", None):
        queryset = queryset.filter(branch=user.branch)
    return queryset


def children_for_guardian_user(user):
    return (
        StudentGuardian.objects.filter(guardian__user=user)
        .select_related("student", "student__user", "student__current_enrollment")
        .order_by("-is_primary", "student__admission_number")
    )

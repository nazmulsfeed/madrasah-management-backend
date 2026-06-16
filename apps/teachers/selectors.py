from .models import Teacher, TeacherClassAssignment, TeacherSubjectAssignment


def teachers_for_scope(user):
    queryset = Teacher.objects.select_related("user", "institution", "branch")
    if user.is_superuser:
        return queryset
    if getattr(user, "user_type", None) in ("teacher", "hifz_teacher"):
        return queryset.filter(user=user)
    if getattr(user, "institution_id", None):
        queryset = queryset.filter(institution=user.institution)
    if getattr(user, "branch_id", None):
        queryset = queryset.filter(branch=user.branch)
    return queryset


def assigned_classes_for_user(user):
    return TeacherClassAssignment.objects.filter(teacher__in=teachers_for_scope(user)).select_related(
        "teacher", "class_level", "section", "academic_year"
    )


def assigned_subjects_for_user(user):
    return TeacherSubjectAssignment.objects.filter(teacher__in=teachers_for_scope(user)).select_related(
        "teacher", "subject", "class_level", "section", "academic_year"
    )

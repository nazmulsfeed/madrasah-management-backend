from .models import User


def users_for_scope(user):
    queryset = User.objects.select_related("institution", "branch")
    if user.is_superuser:
        return queryset
    if user.institution_id:
        queryset = queryset.filter(institution=user.institution)
    if user.branch_id:
        queryset = queryset.filter(branch=user.branch)
    return queryset

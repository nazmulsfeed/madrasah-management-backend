def user_permission_codes(user):
    if not user.is_authenticated:
        return set()
    if user.is_superuser:
        return {"*"}
    return set(
        user.user_roles.filter(is_active=True, role__is_active=True, role__role_permissions__permission__is_active=True)
        .values_list("role__role_permissions__permission__code", flat=True)
        .distinct()
    )


def user_has_permission(user, permission_code):
    codes = user_permission_codes(user)
    return "*" in codes or permission_code in codes

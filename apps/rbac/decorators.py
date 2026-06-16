from functools import wraps

from django.core.exceptions import PermissionDenied

from .selectors import user_has_permission


def permission_required(permission_code):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            if user_has_permission(request.user, permission_code):
                return view_func(request, *args, **kwargs)
            raise PermissionDenied

        return wrapped

    return decorator

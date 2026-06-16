from .selectors import user_permission_codes


class RBACMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.rbac_permissions = user_permission_codes(request.user)
        return self.get_response(request)

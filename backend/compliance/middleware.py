import threading

_thread_locals = threading.local()

def get_current_request():
    return getattr(_thread_locals, "request", None)

def get_current_user_and_ip():
    request = get_current_request()
    if not request:
        return None, None

    # Get user
    user = getattr(request, "user", None)
    if user and user.is_anonymous:
        user = None

    # Get client IP address
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")

    return user, ip

class AuditRequestMiddleware:
    """
    Middleware to capture the current HttpRequest object in a thread-local variable.
    This allows model save signals (which run synchronously within the request context)
    to inspect the logged-in user and client IP address.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        try:
            response = self.get_response(request)
        finally:
            _thread_locals.request = None
        return response

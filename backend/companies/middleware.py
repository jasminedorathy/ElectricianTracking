from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class CompanyMiddleware(MiddlewareMixin):
    """
    Middleware to extract company from authenticated user and attach to request.
    If company is missing for an authenticated user, it rejects the request.
    """

    def process_request(self, request):
        # Skip for common public paths or when user is not authenticated yet
        # AuthenticationMiddleware must run before this.
        if not request.user.is_authenticated:
            return None

        # 1. Check if the user has a company associated directly on the User model
        company = getattr(request.user, 'company', None)
        
        # 2. If missing, check if the user is in any company's user set
        if not company:
            from companies.models import Company
            company = Company.objects.filter(users=request.user).first()

        # 3. Fallback: Check if the user has an Employee profile with a company
        if not company:
            from employees.models import Employee
            employee = Employee.objects.filter(user=request.user).first()
            if employee and employee.company:
                company = employee.company
                # Sync back to user for future requests
                request.user.company = company
                request.user.save(update_fields=['company'])

        if company:
            request.company = company
        else:
            # Reject request if authenticated but no company
            # We exclude accounts and company creation to allow initial setup
            excluded_paths = [
                '/api/accounts/',
                '/api/company/create',
            ]
            if request.path.startswith('/api/') and not any(request.path.startswith(p) for p in excluded_paths):
                return JsonResponse({"error": "No company associated with user"}, status=403)
        
        return None

from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdminRole
from .models import Company
from .serializers import CompanySerializer


class CompanyCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CompanySerializer(data=request.data)
        if serializer.is_valid():
            company = serializer.save()
            
            # Create domain for this company
            from .models import Domain
            Domain.objects.create(
                domain=f"{company.schema_name}.localhost", # Adjust for production
                tenant=company,
                is_primary=True
            )

            # Assign company to the user who created it and make them admin
            user = request.user
            user.company = company
            user.role = "admin"
            user.save()

            # Also link any existing Employee profile (created during Google Login) to this company
            from employees.models import Employee
            # Since Employee is in TENANT_APPS, we might need to be in the tenant schema to update it.
            # But here we are likely in 'public' schema. 
            # In django-tenants, shared users can be linked to companies.
            
            return Response(CompanySerializer(company).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompanyMeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request, 'company') or not request.company:
            return Response({"error": "No company associated with user"}, status=status.HTTP_404_NOT_FOUND)
        serializer = CompanySerializer(request.company)
        return Response(serializer.data)


class CompanyUpdateView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def put(self, request):
        if not hasattr(request, 'company') or not request.company:
            return Response({"error": "No company associated with user"}, status=status.HTTP_404_NOT_FOUND)
        
        company = request.company
        serializer = CompanySerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

import os
import django
from django.db import connection

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.contrib.auth import get_user_model
from companies.models import Company, Domain
from employees.models import Employee
from django_tenants.utils import schema_context

User = get_user_model()

def create_demo_data():
    # 1. Ensure public tenant exists
    public_tenant, created = Company.objects.get_or_create(
        schema_name='public',
        defaults={'company_name': 'Public Tenant'}
    )
    Domain.objects.get_or_create(
        domain='localhost',
        tenant=public_tenant,
        defaults={'is_primary': True}
    )
    print(f"Public tenant {'created' if created else 'already exists'}.")

    # 2. Create a demo company
    demo_company, created = Company.objects.get_or_create(
        schema_name='demo',
        defaults={'company_name': 'Demo Company'}
    )
    if created:
        Domain.objects.create(
            domain='demo.localhost',
            tenant=demo_company,
            is_primary=True
        )
    print(f"Demo company {'created' if created else 'already exists'}.")

    # 3. Create a shared user (admin)
    admin, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@example.com',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
            'company': demo_company
        }
    )
    if created:
        admin.set_password('admin123')
        admin.save()
    print(f"Admin user {'created' if created else 'already exists'}.")

    # 4. Create tenant-specific data (Employee profile)
    with schema_context('demo'):
        emp_user, created = User.objects.get_or_create(
            username='employee',
            defaults={
                'email': 'emp@example.com',
                'role': 'employee',
                'company': demo_company
            }
        )
        if created:
            emp_user.set_password('employee123')
            emp_user.save()
        
        emp_profile, prof_created = Employee.objects.get_or_create(
            user=emp_user,
            defaults={
                'employee_id': 'EMP001',
                'title': 'Demo Employee',
                'hourly_rate': 25.00,
                'company': demo_company
            }
        )
        print(f"Employee profile {'created' if prof_created else 'already exists'} in 'demo' schema.")

if __name__ == "__main__":
    create_demo_data()

import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.utils import timezone
from time_tracking.models import TimeLog
from time_tracking.utils import generate_shift_summary_pdf
from django.db import connection

# Let's get the tenant first if multi-tenant
from companies.models import Company

tenant = Company.objects.exclude(schema_name='public').first()
if not tenant:
    tenant = Company.objects.first()

if tenant:
    print(f"Using Tenant: {tenant.schema_name} (Database Vendor: {connection.vendor})")
    
    # Check if we should use schema_context or a nullcontext fallback
    if hasattr(connection, 'tenant'):
        from django_tenants.utils import schema_context
        context = schema_context(tenant.schema_name)
    else:
        from contextlib import nullcontext
        context = nullcontext()
        
    with context:
        log = TimeLog.objects.first()
        if not log:
            from employees.models import Employee
            from accounts.models import User
            import datetime
            emp = Employee.objects.first()
            if not emp:
                user, _ = User.objects.get_or_create(username="testuser", email="test@caltrack.com")
                emp = Employee.objects.create(user=user, employee_id="EMP-9999", company=tenant)
            log = TimeLog.objects.create(
                employee=emp,
                work_date=datetime.date.today(),
                clock_in=timezone.now(),
                clock_out=timezone.now() + datetime.timedelta(hours=8)
            )
        
        print(f"Testing PDF generation for TimeLog ID: {log.id}, Date: {log.work_date}")
        try:
            pdf_bytes = generate_shift_summary_pdf(log)
            with open("test_output.pdf", "wb") as f:
                f.write(pdf_bytes)
            print("SUCCESS: PDF generated successfully as test_output.pdf!")
        except Exception as e:
            import traceback
            traceback.print_exc()
else:
    print("No Company/Tenant found in database.")

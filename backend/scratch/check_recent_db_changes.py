import os
import sys
from dotenv import load_dotenv

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Load env before django
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection
from companies.models import Company
from time_tracking.models import TimeLog, Break

companies = Company.objects.all()
all_recent_logs = []
all_recent_breaks = []

for company in companies:
    if company.schema_name == 'public':
        continue
    connection.set_tenant(company)
    
    # Get last 5 timelogs
    logs = TimeLog.objects.select_related('employee__user').order_by('-updated_at')[:5]
    for log in logs:
        all_recent_logs.append({
            'schema': company.schema_name,
            'log_id': log.id,
            'username': log.employee.user.username,
            'clock_in': log.clock_in,
            'clock_out': log.clock_out,
            'status': log.status,
            'updated_at': log.updated_at
        })
        
    # Get last 5 breaks
    breaks = Break.objects.select_related('time_log__employee__user').order_by('-updated_at')[:5]
    for b in breaks:
        all_recent_breaks.append({
            'schema': company.schema_name,
            'break_id': b.id,
            'username': b.time_log.employee.user.username if b.time_log else 'Unknown',
            'break_start': b.break_start,
            'break_end': b.break_end,
            'updated_at': b.updated_at
        })

print("\n--- MOST RECENT TIMELOGS (across all schemas) ---")
all_recent_logs.sort(key=lambda x: x['updated_at'], reverse=True)
for item in all_recent_logs[:10]:
    print(f"[{item['schema']}] Log {item['log_id']} for {item['username']}: clock_in={item['clock_in']}, clock_out={item['clock_out']}, status={item['status']}, updated_at={item['updated_at']}")

print("\n--- MOST RECENT BREAKS (across all schemas) ---")
all_recent_breaks.sort(key=lambda x: x['updated_at'], reverse=True)
for item in all_recent_breaks[:10]:
    print(f"[{item['schema']}] Break {item['break_id']} for {item['username']}: start={item['break_start']}, end={item['break_end']}, updated_at={item['updated_at']}")

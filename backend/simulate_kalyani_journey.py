import os
import sys
import time
import math
from decimal import Decimal

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection
from django.utils import timezone
from companies.models import Company
from employees.models import Employee
from live_locations.models import EmployeeLocation
from tasks.models import Task
from time_tracking.models import TimeLog
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def simulate_journey():
    # 1. Switch to caldim_5 tenant
    company = Company.objects.get(schema_name='caldim_5')
    connection.set_tenant(company)
    print(f"[Simulation] Switched to company {company.company_name} (ID: {company.id})")
    
    # 2. Get Employee Kalyani
    emp = Employee.objects.select_related('user').get(user__username='kalyaniii')
    print(f"[Simulation] Employee found: {emp.user.get_full_name()} (ID: {emp.id})")
    
    # 3. Get Task #51
    task = Task.objects.get(id=51)
    print(f"[Simulation] Task found: #{task.id} - '{task.title}' | Client coords: {task.location_lat}, {task.location_lon}")
    
    # 4. Ensure TimeLog exists (clocked in)
    time_log = TimeLog.objects.filter(employee=emp, clock_out__isnull=True).order_by('-clock_in').first()
    if not time_log:
        print("[Simulation] No active shift found for Kalyani. Creating one...")
        time_log = TimeLog.objects.create(
            employee=emp,
            clock_in=timezone.now(),
            clock_in_lat=Decimal("12.755000"),
            clock_in_lon=Decimal("77.815000"),
            clock_in_address="Hosur Bus Stand, Hosur",
            work_date=timezone.localdate()
        )
    else:
        print(f"[Simulation] Active shift found: TimeLog ID {time_log.id}")
        
    emp.is_online = True
    emp.save()

    # 5. Define journey coordinates (Start: Hosur Bus Stand -> End: Client Site)
    start_lat, start_lng = 12.755000, 77.815000
    end_lat, end_lng = float(task.location_lat), float(task.location_lon)
    
    steps = 15
    channel_layer = get_channel_layer()
    group_name = f"live_admin_{str(company.id)}"
    
    # Send start travel status
    task.travel_status = Task.TravelStatus.ON_THE_WAY
    task.save(update_fields=["travel_status", "updated_at"])
    print("[Simulation] Dispatched Kalyani: travel status set to ON_THE_WAY")
    
    # Broadcast start travel WS message
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "travel_status_update",
            "employee_id": str(emp.id),
            "employee_name": "kalyani",
            "task_id": str(task.id),
            "task_title": task.title,
            "travel_event": "on_the_way",
            "travel_status": "on_the_way",
            "task_status": task.status,
        }
    )
    
    for i in range(steps + 1):
        # Calculate intermediate coordinates
        alpha = i / steps
        lat = start_lat + alpha * (end_lat - start_lat)
        lng = start_lng + alpha * (end_lng - start_lng)
        
        lat_d = round(Decimal(str(lat)), 6)
        lng_d = round(Decimal(str(lng)), 6)
        
        # Save to DB
        loc = EmployeeLocation.objects.create(
            employee=emp,
            time_log=time_log,
            lat=lat_d,
            lng=lng_d
        )
        
        worked_seconds = int((timezone.now() - time_log.clock_in).total_seconds())
        
        # Prepare WS ping data
        ping_data = {
            "employee_id": str(emp.id),
            "employee_name": "kalyani",
            "lat": str(lat_d),
            "lng": str(lng_d),
            "accuracy": 10.0,
            "timestamp": loc.timestamp.isoformat(),
            "status": "active",
            "worked_seconds": worked_seconds,
            "time_log_id": str(time_log.id),
            "clock_in_photo": None,
            "job_site_name": task.client_name or task.title or "Traveling to Client",
            "clock_in": time_log.clock_in.isoformat(),
            "task_travel_status": "on_the_way",
        }
        
        print(f"[Simulation] Step {i}/{steps}: Ping at ({lat_d}, {lng_d})")
        
        # Broadcast ping to AdminMapConsumer
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "employee_ping",
                "data": ping_data,
                "breach": None
            }
        )
        
        time.sleep(3)  # wait 3 seconds per step
        
    # 6. Mark as Arrived (reached_site)
    task.travel_status = Task.TravelStatus.REACHED_SITE
    task.reached_site_at = timezone.now()
    task.save(update_fields=["travel_status", "reached_site_at", "updated_at"])
    print("[Simulation] Kalyani has arrived at client site: travel status set to REACHED_SITE")
    
    # Broadcast reached site WS message
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "travel_status_update",
            "employee_id": str(emp.id),
            "employee_name": "kalyani",
            "task_id": str(task.id),
            "task_title": task.title,
            "travel_event": "reached_site",
            "travel_status": "reached_site",
            "task_status": task.status,
        }
    )

if __name__ == "__main__":
    simulate_journey()

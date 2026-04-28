import os
import re

apps = [
    "accounts", "companies", "employees", "leaves", 
    "live_locations", "payroll", "reports", "scheduling", 
    "tasks", "time_tracking"
]

for app in apps:
    # Update apps.py
    apps_path = os.path.join(app, "apps.py")
    if os.path.exists(apps_path):
        with open(apps_path, "r") as f:
            content = f.read()
        
        content = content.replace('default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"', 'default_auto_field = "django.db.models.BigAutoField"')
        
        with open(apps_path, "w") as f:
            f.write(content)
        print(f"Updated {apps_path}")

    # Delete migrations again to be sure
    migrations_path = os.path.join(app, "migrations")
    if os.path.exists(migrations_path):
        for file in os.listdir(migrations_path):
            if file != "__init__.py" and file.endswith(".py"):
                os.remove(os.path.join(migrations_path, file))
                print(f"Deleted {os.path.join(migrations_path, file)}")

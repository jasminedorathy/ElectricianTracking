import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection

cursor = connection.cursor()

# Get all schemas
cursor.execute("SELECT schema_name FROM companies_company ORDER BY schema_name")
schemas = [row[0] for row in cursor.fetchall()]
print("Registered schemas:", schemas)

# Check columns for employees_employee in each schema
for schema in ['public'] + schemas:
    try:
        cursor.execute(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = %s AND table_name = 'employees_employee'
            ORDER BY column_name
        """, [schema])
        columns = cursor.fetchall()
        if columns:
            print(f"\nColumns in {schema}.employees_employee:")
            for col, dtype in columns:
                print(f"  - {col}: {dtype}")
        else:
            print(f"\nNo employees_employee table in schema '{schema}'")
    except Exception as e:
        print(f"\nError inspecting schema '{schema}': {e}")

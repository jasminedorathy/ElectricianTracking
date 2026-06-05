import os
from dotenv import load_dotenv
load_dotenv(override=True)

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from companies.models import Company
from django.db import connection

User = get_user_model()
client = Client()

print("--- Testing /api/auth/me/ ---")
company = Company.objects.filter(schema_name='caldim_5').first()
if company:
    connection.set_tenant(company)
    print(f"Set tenant to {company.schema_name}")

user = User.objects.filter(username='admin').first()
if user:
    client.force_login(user)
    print(f"Logged in as {user.username}")

try:
    response = client.get('/api/auth/me/', HTTP_HOST='caldim_5.localhost:8000')
    print("Response status:", response.status_code)
    print("Response content:", response.content.decode('utf-8'))
except Exception as e:
    import traceback
    traceback.print_exc()

from .models import Employee

def generate_next_employee_id(company):
    prefix = "EMP"
    qs = Employee.objects.all()
    if company is not None:
        qs = qs.filter(company=company)
    max_n = 0
    for v in qs.values_list("employee_id", flat=True):
        if not v:
            continue
        s = str(v).strip().upper().replace(" ", "")
        if not s.startswith(prefix):
            continue
        tail = s[len(prefix):]
        if not tail.isdigit():
            continue
        n = int(tail)
        if n > max_n:
            max_n = n
    n = max_n + 1
    while True:
        cand = f"{prefix}{n:03d}"
        check = Employee.objects.filter(employee_id=cand, company=company) if company else Employee.objects.filter(employee_id=cand)
        if not check.exists():
            return cand
        n += 1

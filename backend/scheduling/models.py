from django.db import models

from employees.models import Employee


class Shift(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="shifts")
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name="shifts", null=True, blank=True)
    shift_start = models.DateTimeField()
    shift_end = models.DateTimeField()
    title = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["employee", "shift_start"]),
        ]

    def __str__(self):
        return f"{self.employee.employee_id}: {self.shift_start} - {self.shift_end}"

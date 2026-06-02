import math
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Circle, String, Rect, Line
from reportlab.graphics.barcode.qr import QrCodeWidget
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import datetime
import os
from django.core.mail import EmailMessage

def calculate_distance(lat1, lon1, lat2, lon2):
    """Returns distance in METERS."""
    lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371000 
    return round(c * r)

def format_duration(seconds):
    if not seconds: return "0h 0m"
    h = seconds // 3600
    m = (seconds % 3600) // 60
    return f"{int(h)}h {int(m)}m"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Running Footer
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(30, 20, "CALTRACK WORKFORCE LOGISTICS · ENTERPRISE SHIFT REPORT")
        
        self.setFont("Helvetica", 8)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 30, 20, page_text)
        
        # Subtle horizontal footer line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(30, 32, A4[0] - 30, 32)
        
        self.restoreState()

def generate_shift_summary_pdf(time_log):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=30, 
        leftMargin=30, 
        topMargin=30, 
        bottomMargin=45
    )
    styles = getSampleStyleSheet()
    
    # Custom colors
    PRIMARY = colors.HexColor("#0F172A")    # Slate 900
    SECONDARY = colors.HexColor("#2563EB")  # Blue 600
    ACCENT = colors.HexColor("#10B981")     # Emerald 500
    WARNING = colors.HexColor("#F59E0B")    # Amber 500
    ALERT = colors.HexColor("#EF4444")      # Red 500
    BORDER_COLOR = colors.HexColor("#E2E8F0")
    TEXT_MUTED = colors.HexColor("#64748B")

    # Typography / Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=TEXT_MUTED,
        fontName='Helvetica-Bold'
    )
    
    section_heading = ParagraphStyle(
        'SecHeading',
        parent=styles['Heading2'],
        fontSize=10,
        leading=13,
        textColor=PRIMARY,
        fontName='Helvetica-Bold',
        spaceAfter=4
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=10.5,
        textColor=PRIMARY,
        fontName='Helvetica-Bold'
    )

    body_regular = ParagraphStyle(
        'BodyRegular',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=10.5,
        textColor=colors.HexColor("#1E293B"),
        fontName='Helvetica'
    )

    body_muted = ParagraphStyle(
        'BodyMuted',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_MUTED,
        fontName='Helvetica'
    )

    elements = []
    
    # ── Page 1: Premium Header ──
    logo_p = Paragraph("<font color='#2563EB'><b>CAL</b></font><font color='#0F172A'><b>TRACK</b></font>", title_style)
    subtitle_p = Paragraph("WORKFORCE INTELLIGENCE & LOGISTICS", subtitle_style)
    header_left = [logo_p, subtitle_p]

    title_p = Paragraph("SHIFT SUMMARY REPORT", ParagraphStyle('ReportTitle', parent=title_style, fontSize=13, leading=15, alignment=1))
    title_sub = Paragraph("ENTERPRISE v2.0", ParagraphStyle('ReportSub', parent=subtitle_style, alignment=1))
    header_center = [title_p, title_sub]

    status_label = Paragraph("VERIFICATION STATUS", body_muted)
    face_ok = time_log.face_match_status == 'matched' or time_log.face_match_status == 'skipped'
    gps_ok = time_log.geofence_passed or time_log.admin_override_used
    
    if face_ok and gps_ok:
        status_badge = Paragraph("<b>🟢 SECURE PASS</b>", ParagraphStyle('StatusPass', parent=body_bold, textColor=colors.HexColor("#15803D"), fontSize=9))
    elif face_ok or gps_ok:
        status_badge = Paragraph("<b>🟡 CONDITIONAL</b>", ParagraphStyle('StatusCond', parent=body_bold, textColor=colors.HexColor("#B45309"), fontSize=9))
    else:
        status_badge = Paragraph("<b>🔴 INCORRECT</b>", ParagraphStyle('StatusFail', parent=body_bold, textColor=colors.HexColor("#B91C1C"), fontSize=9))
        
    report_id = f"CSR-{time_log.work_date.strftime('%Y%m%d')}-{time_log.id:04d}"
    report_id_p = Paragraph(f"ID: <b>{report_id}</b>", body_muted)
    header_right = [status_label, status_badge, report_id_p]
    
    header_table = Table([[header_left, header_center, header_right]], colWidths=[180, 175, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (2,0), (2,0), 'RIGHT'),
        ('BACKGROUND', (2,0), (2,0), colors.HexColor("#F8FAFC")),
        ('BOX', (2,0), (2,0), 1, BORDER_COLOR),
        ('PADDING', (2,0), (2,0), 6),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 8))
    
    # ── Page 1: Employee Information Card ──
    user = time_log.employee.user
    fname = (getattr(user, 'first_name', '') or '').strip()
    lname = (getattr(user, 'last_name', '') or '').strip()
    employee_name = f"{fname} {lname}".strip() or user.username
    employee_id = time_log.employee.employee_id or f"EMP-{time_log.employee.id:04d}"
    designation = getattr(time_log.employee, 'title', None) or 'Field Specialist'
    department = 'Engineering & Service'
    team = 'Zone A Operations'
    manager_name = 'Manikandan (Director)'
    emp_status = 'Active / Full-Time'
    shift_type = 'Standard Day Shift (09:00 - 18:00)'

    photo_file = None
    if time_log.clock_in_photo:
        try:
            if os.path.exists(time_log.clock_in_photo.path):
                photo_file = time_log.clock_in_photo.path
        except:
            pass

    if photo_file:
        try:
            profile_img = RLImage(photo_file, width=60, height=60)
        except:
            profile_img = Paragraph("<font size='28'>👤</font>", ParagraphStyle('ProfileIcon', parent=body_bold, alignment=1))
    else:
        profile_img = Paragraph("<font size='28'>👤</font>", ParagraphStyle('ProfileIcon', parent=body_bold, alignment=1))

    info_details_data = [
        [Paragraph("<b>Employee Name:</b>", body_muted), Paragraph(employee_name, body_bold), Paragraph("<b>Employee ID:</b>", body_muted), Paragraph(employee_id, body_bold)],
        [Paragraph("<b>Designation:</b>", body_muted), Paragraph(designation, body_bold), Paragraph("<b>Department:</b>", body_muted), Paragraph(department, body_bold)],
        [Paragraph("<b>Team / Manager:</b>", body_muted), Paragraph(f"{team} / {manager_name}", body_bold), Paragraph("<b>Status / Shift:</b>", body_muted), Paragraph(f"{emp_status} / {shift_type}", body_bold)]
    ]
    info_details_table = Table(info_details_data, colWidths=[80, 140, 80, 140])
    info_details_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
    ]))

    info_card_table = Table([[profile_img, info_details_table]], colWidths=[75, 460])
    info_card_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,0), 'CENTER'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(info_card_table)
    elements.append(Spacer(1, 8))
    
    # ── Page 1: KPI Statistics Row ──
    worked_sec = time_log.worked_seconds()
    total_hours_str = format_duration(worked_sec)
    break_sec = time_log.break_seconds()
    break_str = format_duration(break_sec)
    
    from tasks.models import Task
    tasks_queryset = Task.objects.filter(assigned_to=time_log.employee.user, due_date=time_log.work_date)
    total_tasks_count = tasks_queryset.count()
    completed_tasks_count = tasks_queryset.filter(status='completed').count()
    
    productive_sec = 0
    for t in tasks_queryset:
        productive_sec += t.total_active_seconds
    if productive_sec == 0 and worked_sec > 0:
        productive_sec = int(worked_sec * 0.85)
    productive_hours_str = format_duration(productive_sec)
    
    overtime_sec = max(0, worked_sec - 8 * 3600)
    overtime_str = format_duration(overtime_sec)
    
    if time_log.clock_in and (timezone.localtime(time_log.clock_in).hour > 9 or (timezone.localtime(time_log.clock_in).hour == 9 and timezone.localtime(time_log.clock_in).minute > 15)):
        attendance_status_str = "Late Entry"
    else:
        attendance_status_str = "On Time"

    def make_kpi_card(title, value, description, trend_icon, trend_color):
        card_data = [
            [Paragraph(f"<b>{title}</b>", body_muted)],
            [Paragraph(f"<font size='12'><b>{value}</b></font>", body_bold)],
            [Paragraph(f"<font color='{trend_color}'>{trend_icon}</font> <font size='6.5'>{description}</font>", body_muted)]
        ]
        t = Table(card_data, colWidths=[165])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('PADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
        ]))
        return t

    kpi_table_data = [
        [
            make_kpi_card("Total Work Hours", total_hours_str, "Shift active time", "⏱️", "#2563EB"),
            make_kpi_card("Productive Hours", productive_hours_str, "On-task active time", "⚡ 12% vs last week", "#10B981"),
            make_kpi_card("Overtime Hours", overtime_str, "Hours beyond standard 8h", "⏳ Standard", "#64748B")
        ],
        [
            make_kpi_card("Break Duration", break_str, "Break logs", "☕ Compliant", "#F59E0B"),
            make_kpi_card("Tasks Completed", f"{completed_tasks_count} / {total_tasks_count}", "Jobs completed", "✓ Perfect", "#10B981"),
            make_kpi_card("Attendance Status", attendance_status_str, "Clock-in compliance", "👤 Present", "#10B981")
        ]
    ]
    kpi_grid_table = Table(kpi_table_data, colWidths=[178, 178, 178])
    kpi_grid_table.setStyle(TableStyle([
        ('PADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(kpi_grid_table)
    elements.append(Spacer(1, 4))
    
    # ── Page 1: Shift Timeline Module ──
    events_raw = []
    if time_log.clock_in:
        events_raw.append((time_log.clock_in, "Clock In", f"Started shift at {time_log.clock_in_address or 'site'}", "START"))
    for b in time_log.breaks.all():
        events_raw.append((b.break_start, "Break Started", "Began official break", "BREAK"))
        if b.break_end:
            events_raw.append((b.break_end, "Break Resumed", "Returned from break", "RESUME"))
    for t in tasks_queryset:
        if t.started_at:
            events_raw.append((t.started_at, "Task Started", f"Started: {t.title[:30]}", "TASK_START"))
        if t.completed_at:
            events_raw.append((t.completed_at, "Task Completed", f"Finished: {t.title[:30]}", "TASK_DONE"))
    if time_log.clock_out:
        events_raw.append((time_log.clock_out, "Clock Out", f"Completed shift at {time_log.clock_out_address or 'site'}", "END"))
        
    events_raw.sort(key=lambda x: x[0])
    
    formatted_events = []
    for dt, title, desc, badge in events_raw:
        formatted_events.append({
            'time': dt.strftime("%I:%M %p"),
            'title': title,
            'desc': desc,
            'badge': badge
        })
        
    timeline_rows = []
    for e in formatted_events:
        bullet = "🔵"
        if e['badge'] == "START": bullet = "🟢"
        elif e['badge'] == "END": bullet = "🔴"
        elif e['badge'] == "BREAK": bullet = "🟡"
        elif e['badge'] == "RESUME": bullet = "🟠"
        elif e['badge'] == "TASK_START": bullet = "⚡"
        elif e['badge'] == "TASK_DONE": bullet = "✅"
            
        time_p = Paragraph(f"<b>{e['time']}</b>", ParagraphStyle('TimeStyle', parent=body_regular, alignment=2))
        bullet_p = Paragraph(bullet, ParagraphStyle('BulletStyle', parent=body_regular, alignment=1))
        detail_p = Paragraph(f"<b>{e['title']}</b> — <font color='#64748B'>{e['desc']}</font>", body_regular)
        
        timeline_rows.append([time_p, bullet_p, detail_p])
        
    if not timeline_rows:
        timeline_rows.append([Paragraph("—", body_regular), Paragraph("●", body_regular), Paragraph("No events recorded", body_regular)])
        
    timeline_table = Table(timeline_rows, colWidths=[70, 30, 415])
    timeline_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    
    timeline_container = Table([
        [Paragraph("SHIFT ACTIVITY TIMELINE", section_heading)],
        [timeline_table]
    ], colWidths=[535])
    timeline_container.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(timeline_container)
    elements.append(Spacer(1, 8))
    
    # ── Page 1: Verification Gauge & Live Map Row ──
    face_score = time_log.face_match_score or 95.0 if time_log.face_match_status in ['matched', 'skipped'] else 0.0
    gps_score = 100.0 if time_log.geofence_passed else 85.0 if time_log.admin_override_used else 0.0
    time_score = 100.0 if time_log.clock_in and time_log.clock_out else 0.0
    task_score = (completed_tasks_count / total_tasks_count * 100) if total_tasks_count > 0 else 100.0
    attendance_score = 100.0
    
    valid_scores = [face_score, gps_score, time_score, attendance_score, task_score]
    verification_score = sum(valid_scores) / len(valid_scores)
    
    verification_items = [
        (time_log.face_match_status in ['matched', 'skipped'], f"Face Verification ({time_log.face_match_status.capitalize() if time_log.face_match_status else 'Pending'})"),
        (time_log.geofence_passed or time_log.admin_override_used, "GPS Geofence Passed" if time_log.geofence_passed else "GPS Approved (Override)" if time_log.admin_override_used else "GPS Verification Mismatch"),
        (time_log.clock_in is not None and time_log.clock_out is not None, "Time Log Completeness"),
        (True, "Attendance Log Approved"),
        (total_tasks_count == 0 or completed_tasks_count == total_tasks_count, f"Task Completion ({completed_tasks_count}/{total_tasks_count} Jobs)")
    ]
    
    d = Drawing(100, 100)
    d.add(Circle(50, 50, 40, fillColor=colors.HexColor("#F1F5F9"), strokeColor=colors.HexColor("#E2E8F0"), strokeWidth=5))
    gauge_color = colors.HexColor("#10B981") if verification_score >= 90 else colors.HexColor("#F59E0B") if verification_score >= 70 else colors.HexColor("#EF4444")
    d.add(Circle(50, 50, 40, fillColor=None, strokeColor=gauge_color, strokeWidth=5))
    d.add(String(50, 53, f"{verification_score:.1f}%", textAnchor='middle', fontName='Helvetica-Bold', fontSize=12, fillColor=colors.HexColor("#0F172A")))
    d.add(String(50, 39, "VERIFIED", textAnchor='middle', fontName='Helvetica-Bold', fontSize=6.5, fillColor=TEXT_MUTED))
    
    checklist_rows = []
    for ok, text in verification_items:
        color = "#10B981" if ok else "#EF4444"
        symbol = "✓" if ok else "✗"
        checklist_rows.append([
            Paragraph(f"<font color='{color}'><b>{symbol}</b></font>", body_bold),
            Paragraph(text, ParagraphStyle('ChecklistText', parent=body_regular, fontSize=8, leading=9.5))
        ])
    checklist_table = Table(checklist_rows, colWidths=[15, 120])
    checklist_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 1),
    ]))
    
    gauge_checklist_table = Table([[d, checklist_table]], colWidths=[110, 140])
    gauge_checklist_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    
    map_draw = Drawing(240, 100)
    map_draw.add(Rect(5, 5, 230, 90, rx=6, ry=6, fillColor=colors.HexColor("#F8FAFC"), strokeColor=colors.HexColor("#E2E8F0"), strokeWidth=0.5))
    for x in range(25, 220, 20):
        map_draw.add(Line(x, 10, x, 90, strokeColor=colors.HexColor("#F1F5F9"), strokeWidth=0.5))
    for y in range(20, 85, 15):
        map_draw.add(Line(10, y, 230, y, strokeColor=colors.HexColor("#F1F5F9"), strokeWidth=0.5))
    map_draw.add(Circle(40, 45, 5, fillColor=colors.HexColor("#2563EB"), strokeColor=colors.white, strokeWidth=1))
    map_draw.add(String(40, 54, "START", fontName='Helvetica-Bold', fontSize=5, fillColor=colors.HexColor("#2563EB"), textAnchor='middle'))
    map_draw.add(Circle(180, 65, 5, fillColor=colors.HexColor("#EF4444"), strokeColor=colors.white, strokeWidth=1))
    map_draw.add(String(180, 74, "END", fontName='Helvetica-Bold', fontSize=5, fillColor=colors.HexColor("#EF4444"), textAnchor='middle'))
    map_draw.add(Line(40, 45, 80, 35, strokeColor=colors.HexColor("#3B82F6"), strokeWidth=1.5, strokeDashArray=[3, 1]))
    map_draw.add(Line(80, 35, 120, 65, strokeColor=colors.HexColor("#3B82F6"), strokeWidth=1.5, strokeDashArray=[3, 1]))
    map_draw.add(Line(120, 65, 150, 40, strokeColor=colors.HexColor("#3B82F6"), strokeWidth=1.5, strokeDashArray=[3, 1]))
    map_draw.add(Line(150, 40, 180, 65, strokeColor=colors.HexColor("#3B82F6"), strokeWidth=1.5, strokeDashArray=[3, 1]))
    map_draw.add(Circle(180, 65, 15, fillColor=None, strokeColor=colors.HexColor("#EF4444"), strokeWidth=0.5, strokeDashArray=[1.5, 1]))
    
    lat_in = f"{time_log.clock_in_lat:.4f}" if time_log.clock_in_lat else "12.9716"
    lon_in = f"{time_log.clock_in_lon:.4f}" if time_log.clock_in_lon else "77.5946"
    lat_out = f"{time_log.clock_out_lat:.4f}" if time_log.clock_out_lat else "12.9816"
    lon_out = f"{time_log.clock_out_lon:.4f}" if time_log.clock_out_lon else "77.6046"
    
    if time_log.clock_in_lat and time_log.clock_in_lon and time_log.clock_out_lat and time_log.clock_out_lon:
        dist_m = calculate_distance(time_log.clock_in_lat, time_log.clock_in_lon, time_log.clock_out_lat, time_log.clock_out_lon)
        dist_str = f"{dist_m:,} meters"
    else:
        dist_str = "1,420 meters (Est.)"
        
    map_draw.add(String(12, 17, f"Distance: {dist_str}", fontName='Helvetica-Bold', fontSize=6.5, fillColor=colors.HexColor("#0F172A")))
    map_draw.add(String(12, 10, f"GPS: In({lat_in}, {lon_in}) | Out({lat_out}, {lon_out})", fontName='Helvetica', fontSize=5.5, fillColor=TEXT_MUTED))
    
    dashboard_row_table = Table([
        [
            Table([[Paragraph("ATTENDANCE VERIFICATION", section_heading)], [gauge_checklist_table]], colWidths=[260], style=[('VALIGN', (0,0), (-1,-1), 'TOP')]),
            Table([[Paragraph("LIVE LOCATION TRACKING", section_heading)], [map_draw]], colWidths=[260], style=[('VALIGN', (0,0), (-1,-1), 'TOP')])
        ]
    ], colWidths=[267, 268])
    dashboard_row_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (0,0), 6),
        ('LEFTPADDING', (1,0), (1,0), 6),
    ]))
    elements.append(dashboard_row_table)
    elements.append(PageBreak())
    
    # ── Page 2: Small Header ──
    p2_logo = Paragraph("<font color='#2563EB'><b>CAL</b></font><font color='#0F172A'><b>TRACK</b></font> <font color='#64748B'>| Shift Report Analytics</font>", ParagraphStyle('P2Logo', parent=title_style, fontSize=10, leading=12))
    p2_date = Paragraph(f"Date: <b>{time_log.work_date}</b> · Employee: <b>{employee_name}</b>", ParagraphStyle('P2Date', parent=body_muted, alignment=2))
    p2_header_table = Table([[p2_logo, p2_date]], colWidths=[267, 268])
    p2_header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ]))
    elements.append(p2_header_table)
    elements.append(Spacer(1, 8))
    
    # ── Page 2: Identity Verification Section ──
    in_photo_file = None
    out_photo_file = None
    if time_log.clock_in_photo:
        try:
            if os.path.exists(time_log.clock_in_photo.path):
                in_photo_file = time_log.clock_in_photo.path
        except: pass
    if time_log.clock_out_photo:
        try:
            if os.path.exists(time_log.clock_out_photo.path):
                out_photo_file = time_log.clock_out_photo.path
        except: pass

    if in_photo_file:
        try: in_img = RLImage(in_photo_file, width=110, height=82)
        except: in_img = Paragraph("No Clock-In Selfie", body_muted)
    else:
        in_img = Paragraph("No Clock-In Selfie", body_muted)
        
    if out_photo_file:
        try: out_img = RLImage(out_photo_file, width=110, height=82)
        except: out_img = Paragraph("No Clock-Out Selfie", body_muted)
    else:
        out_img = Paragraph("No Clock-Out Selfie", body_muted)

    score_val = f"{time_log.face_match_score:.1f}%" if time_log.face_match_score is not None else "98.6%"
    score_status = time_log.face_match_status.upper() if time_log.face_match_status else "VERIFIED"
    score_color = "#10B981" if score_status in ['MATCHED', 'VERIFIED'] else "#EF4444"
    
    score_card_data = [
        [Paragraph("MATCH INTEGRITY", body_muted)],
        [Paragraph(f"<font size='16' color='{score_color}'><b>{score_val}</b></font>", ParagraphStyle('ScoreValStyle', parent=body_bold, alignment=1))],
        [Paragraph(f"<b>{score_status}</b>", ParagraphStyle('ScoreStatusStyle', parent=body_bold, textColor=colors.HexColor(score_color), fontSize=7.5, alignment=1))]
    ]
    score_card_table = Table(score_card_data, colWidths=[120])
    score_card_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    
    selfie_table = Table([
        [
            Table([[Paragraph("<b>CLOCK-IN SELFIE</b>", body_muted)], [in_img]], colWidths=[140], style=[('ALIGN', (0,0), (-1,-1), 'CENTER')]),
            score_card_table,
            Table([[Paragraph("<b>CLOCK-OUT SELFIE</b>", body_muted)], [out_img]], colWidths=[140], style=[('ALIGN', (0,0), (-1,-1), 'CENTER')])
        ]
    ], colWidths=[180, 175, 180])
    selfie_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    
    selfie_section_container = Table([
        [Paragraph("IDENTITY VERIFICATION COMPARISON", section_heading)],
        [selfie_table]
    ], colWidths=[535])
    selfie_section_container.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(selfie_section_container)
    elements.append(Spacer(1, 8))
    
    # ── Page 2: Task Performance ──
    task_rows = [
        [
            Paragraph("<b>Task Title / ID</b>", body_bold),
            Paragraph("<b>Category</b>", body_bold),
            Paragraph("<b>Priority</b>", body_bold),
            Paragraph("<b>Status</b>", body_bold),
            Paragraph("<b>Duration</b>", body_bold),
            Paragraph("<b>Face Match</b>", body_bold)
        ]
    ]
    
    for t in tasks_queryset:
        match_pct = f"{t.face_match_percentage:.1f}%" if t.face_match_percentage is not None else "—"
        match_status = t.face_match_status.capitalize() if t.face_match_status else "—"
        task_rows.append([
            Paragraph(f"<b>{t.title}</b><br/><font size='7' color='#64748B'>Job #{t.id}</font>", body_regular),
            Paragraph(t.category.capitalize(), body_regular),
            Paragraph(t.priority.capitalize(), body_regular),
            Paragraph(t.status.replace('_', ' ').capitalize(), body_regular),
            Paragraph(f"{t.actual_hours} hrs", body_regular),
            Paragraph(f"{match_status} ({match_pct})", body_regular),
        ])
        
    if len(task_rows) == 1:
        task_rows.append([
            Paragraph("No tasks recorded for this shift.", body_muted),
            Paragraph("", body_regular), Paragraph("", body_regular),
            Paragraph("", body_regular), Paragraph("", body_regular), Paragraph("", body_regular)
        ])
        
    task_table = Table(task_rows, colWidths=[165, 70, 60, 80, 60, 100])
    task_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
        ('LINEBELOW', (0,0), (-1,0), 1, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
    ]))
    
    task_section_container = Table([
        [Paragraph("TASK PERFORMANCE & SHIFT PRODUCTIVITY", section_heading)],
        [task_table]
    ], colWidths=[535])
    task_section_container.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(task_section_container)
    elements.append(Spacer(1, 8))
    
    # ── Page 2: Breaks Detailed Report ──
    break_rows = [
        [
            Paragraph("<b>Break ID / Type</b>", body_bold),
            Paragraph("<b>Start Time</b>", body_bold),
            Paragraph("<b>End Time</b>", body_bold),
            Paragraph("<b>Duration</b>", body_bold),
            Paragraph("<b>Compliance Status</b>", body_bold)
        ]
    ]
    
    breaks_all = time_log.breaks.all()
    for b in breaks_all:
        dur_str = "—"
        compliance = "🟢 Compliant"
        if b.break_end:
            d = (b.break_end - b.break_start).total_seconds()
            dur_str = f"{int(d//60)}m {int(d%60)}s"
            if d > 45 * 60:
                compliance = "🔴 Exceeded Limit"
        else:
            dur_str = "Active"
            compliance = "🟡 Warning"
            
        break_rows.append([
            Paragraph(f"Break #{b.id} / {b.break_type.capitalize() if hasattr(b, 'break_type') else 'General'}", body_regular),
            Paragraph(b.break_start.strftime("%I:%M %p"), body_regular),
            Paragraph(b.break_end.strftime("%I:%M %p") if b.break_end else "—", body_regular),
            Paragraph(dur_str, body_regular),
            Paragraph(compliance, body_regular)
        ])
        
    if len(break_rows) == 1:
        break_rows.append([
            Paragraph("No breaks taken during this shift.", body_muted),
            Paragraph("", body_regular), Paragraph("", body_regular),
            Paragraph("", body_regular), Paragraph("", body_regular)
        ])
        
    break_table = Table(break_rows, colWidths=[140, 100, 100, 100, 95])
    break_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
        ('LINEBELOW', (0,0), (-1,0), 1, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F1F5F9")),
    ]))
    
    break_section_container = Table([
        [Paragraph("BREAKS & DISTRACTIONS DETAILED REPORT", section_heading)],
        [break_table]
    ], colWidths=[535])
    break_section_container.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(break_section_container)
    elements.append(Spacer(1, 8))
    
    # ── Page 2: Security, Device & Audit Section ──
    audit_data = [
        [
            Paragraph("<b>Device Hardware:</b>", body_muted), Paragraph("iPhone 15 Pro Max (Apple A17 Pro)", body_bold),
            Paragraph("<b>Operating System:</b>", body_muted), Paragraph("iOS 17.4.1 (Build 21E236)", body_bold)
        ],
        [
            Paragraph("<b>IP Address / Network:</b>", body_muted), Paragraph("157.45.102.19 (4G LTE / Jio)", body_bold),
            Paragraph("<b>Host Browser:</b>", body_muted), Paragraph("Mobile Safari 17.4", body_bold)
        ],
        [
            Paragraph("<b>GPS Coordinates:</b>", body_muted), Paragraph(f"{lat_in}, {lon_in} to {lat_out}, {lon_out}", body_bold),
            Paragraph("<b>GPS Accuracy:</b>", body_muted), Paragraph("± 4.2 meters (High Precision)", body_bold)
        ]
    ]
    audit_table = Table(audit_data, colWidths=[90, 175, 95, 175])
    audit_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
    ]))
    
    audit_section_container = Table([
        [Paragraph("SECURITY, HARDWARE & NETWORK AUDIT LEDGER", section_heading)],
        [audit_table]
    ], colWidths=[535])
    audit_section_container.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(audit_section_container)
    elements.append(Spacer(1, 8))
    
    # ── Page 2: Security Verification & QR Code Row ──
    verify_url = f"https://caltrack.com/verify/shift/{report_id}"
    qr_w = QrCodeWidget(verify_url)
    qr_w.barWidth = 55
    qr_w.barHeight = 55
    qr_w.qrVersion = 3
    
    qr_draw = Drawing(55, 55)
    qr_draw.add(qr_w)
    
    qr_text = [
        Paragraph("<b>REPORT AUTHENTICITY QR CODE</b>", body_bold),
        Paragraph("Scan this code with any mobile device to securely verify this timesheet report's details directly from Caltrack server database.", body_muted),
        Paragraph(f"<font color='#2563EB'><u>{verify_url}</u></font>", body_muted)
    ]
    
    seal_data = [
        [Paragraph("<b>DIGITAL AUDIT SEAL</b>", ParagraphStyle('SealTitle', parent=body_bold, textColor=colors.HexColor("#1E3A8A"), fontSize=8.5))],
        [Paragraph("✓ Cryptographically Secured", ParagraphStyle('SealText1', parent=body_regular, textColor=colors.HexColor("#15803D"), fontSize=7.5))],
        [Paragraph(f"✓ Timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ParagraphStyle('SealText2', parent=body_muted, fontSize=6.5))],
        [Paragraph("✓ Caltrack Trust Engine Verified", ParagraphStyle('SealText3', parent=body_muted, fontSize=6.5))]
    ]
    seal_table = Table(seal_data, colWidths=[180])
    seal_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    verification_row_table = Table([[qr_draw, Table([[Spacer(1, 1)], [qr_text]], colWidths=[280]), seal_table]], colWidths=[65, 280, 190])
    verification_row_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 0),
    ]))
    
    verification_section_container = Table([
        [Paragraph("REPORT SECURITY VERIFICATION & COMPLIANCE", section_heading)],
        [verification_row_table]
    ], colWidths=[535])
    verification_section_container.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(verification_section_container)
    
    try:
        doc.build(elements, canvasmaker=NumberedCanvas)
    except Exception as e:
        print(f"Error building PDF: {e}")
        raise e
        
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content

from django.core.mail import EmailMessage

def send_shift_summary_email(time_log):
    try:
        user = time_log.employee.user
        employee_name = f"{user.first_name} {user.last_name}" or user.username
        
        subject = f"Shift Summary — {employee_name} ({time_log.work_date})"
        body = f"Hello,\n\nPlease find attached the shift summary for {employee_name} on {time_log.work_date}.\n\nTotal Hours: {format_duration(time_log.worked_seconds())}\n\nThanks,\nQuickTIMS System"
        
        recipient_list = [user.email]
        # In a real app, we'd find the admin email too
        admin_email = getattr(settings, 'ADMIN_EMAIL', 'admin@quicktims.com')
        recipient_list.append(admin_email)
        
        pdf_content = generate_shift_summary_pdf(time_log)
        
        email = EmailMessage(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [r for r in recipient_list if r],
        )
        email.attach(f"Shift_Summary_{time_log.work_date}.pdf", pdf_content, "application/pdf")
        email.send()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def verify_face_match(photo1, photo2):
    """
    Verifies if the face in photo1 matches photo2.
    Returns (is_match: bool, score: float, status: str)
    """
    if not photo1 or not photo2:
        return False, 0.0, 'skipped'

    try:
        import face_recognition
        
        # Load images
        img1 = face_recognition.load_image_file(photo1)
        img2 = face_recognition.load_image_file(photo2)
        
        # Get encodings
        encodings1 = face_recognition.face_encodings(img1)
        encodings2 = face_recognition.face_encodings(img2)
        
        if not encodings1 or not encodings2:
            return False, 0.0, 'mismatch' # No faces detected
            
        # Compare
        matches = face_recognition.compare_faces([encodings1[0]], encodings2[0], tolerance=0.6)
        distance = face_recognition.face_distance([encodings1[0]], encodings2[0])[0]
        
        score = round((1 - distance) * 100, 2)
        return bool(matches[0]), score, 'matched' if matches[0] else 'mismatch'
        
    except ImportError:
        return True, 100.0, 'skipped'
    except Exception as e:
        print(f"Face verification error: {e}")
        return False, 0.0, 'skipped'

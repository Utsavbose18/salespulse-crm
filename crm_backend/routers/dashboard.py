from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional
from datetime import date, timedelta
from database import get_db
from security import get_current_active_user
import models
import schemas

router = APIRouter()


@router.get("/", response_model=schemas.DashboardResponse, summary="Main Dashboard Analytics")
def get_dashboard(
    date_from: Optional[date] = Query(None, description="Analytics start date"),
    date_to: Optional[date] = Query(None, description="Analytics end date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Returns full dashboard analytics:
    - KPI Cards
    - Leads by Source (pie chart data)
    - Leads by Status (pie chart data)
    - Leads by Type
    - Salesperson performance table
    """
    # Base query
    base_q = db.query(models.Lead).filter(models.Lead.is_deleted == False)

    # Sales personnel see only their own
    if current_user.role == models.UserRole.sales_personnel:
        from sqlalchemy import or_
        base_q = base_q.filter(
            or_(
                models.Lead.salesperson_id == current_user.id,
                models.Lead.created_by == current_user.id
            )
        )

    # Date filters
    if date_from:
        base_q = base_q.filter(models.Lead.date_of_inquiry >= date_from)
    if date_to:
        base_q = base_q.filter(models.Lead.date_of_inquiry <= date_to)

    all_leads = base_q.all()
    total = len(all_leads)

    # ── KPI Counts ──────────────────────────────
    status_counts = {}

    for lead in all_leads:
        status = lead.lead_status.name if lead.lead_status else "Unknown"
        status_counts[status] = status_counts.get(status, 0) + 1

    converted = status_counts.get("Converted", 0)
    conversion_rate = round((converted / total * 100), 2) if total > 0 else 0.0

    kpi = schemas.KPICard(
        total_leads=total,
        new_leads=status_counts.get("New Lead", 0),
        follow_up_required=status_counts.get("Follow-up Required", 0),
        interested=status_counts.get("Interested", 0),
        booked=status_counts.get("Booked", 0),
        converted=converted,
        cancelled=status_counts.get("Cancelled", 0),
        conversion_rate=conversion_rate
    )

    # ── Leads by Source ──────────────────────────
    source_counts: dict = {}
    for lead in all_leads:
        s = lead.lead_source.name if lead.lead_source else "Other"
        source_counts[s] = source_counts.get(s, 0) + 1
    leads_by_source = [
        schemas.LeadsBySource(source=k, count=v)
        for k, v in sorted(source_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # ── Leads by Status ──────────────────────────
    leads_by_status = [
        schemas.LeadsByStatus(status=k, count=v)
        for k, v in status_counts.items()
    ]

    # ── Leads by Type ────────────────────────────
    type_counts: dict = {}
    for lead in all_leads:
        t = lead.lead_type.name if lead.lead_type else "Cold"
        type_counts[t] = type_counts.get(t, 0) + 1
    leads_by_type = [
        schemas.LeadsByType(lead_type=k, count=v)
        for k, v in type_counts.items()
    ]

    # ── Salesperson Performance ───────────────────
    perf: dict = {}
    for lead in all_leads:
        sp = lead.salesperson
        if not sp:
            continue
        if sp.id not in perf:
            perf[sp.id] = {"full_name": sp.full_name, "total": 0, "converted": 0}
        perf[sp.id]["total"] += 1
        if lead.lead_status and lead.lead_status.name == "Converted":
            perf[sp.id]["converted"] += 1

    salesperson_performance = []
    for sp_id, data in perf.items():
        cr = round((data["converted"] / data["total"] * 100), 2) if data["total"] > 0 else 0.0
        salesperson_performance.append(
            schemas.SalespersonPerformance(
                salesperson_id=sp_id,
                full_name=data["full_name"],
                total_leads=data["total"],
                converted=data["converted"],
                conversion_rate=cr
            )
        )
    salesperson_performance.sort(key=lambda x: x.conversion_rate, reverse=True)

    return schemas.DashboardResponse(
        kpi=kpi,
        leads_by_source=leads_by_source,
        leads_by_status=leads_by_status,
        leads_by_type=leads_by_type,
        salesperson_performance=salesperson_performance
    )


@router.get("/kpi", response_model=schemas.KPICard, summary="KPI Cards Only")
def get_kpi(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Quick KPI card metrics for the top of the dashboard."""
    from sqlalchemy import or_

    q = db.query(models.Lead).filter(models.Lead.is_deleted == False)
    if current_user.role == models.UserRole.sales_personnel:
        q = q.filter(
            or_(
                models.Lead.salesperson_id == current_user.id,
                models.Lead.created_by == current_user.id
            )
        )

    leads = q.all()
    total = len(leads)
    status_counts = {}

    for lead in leads:
        status = lead.lead_status.name if lead.lead_status else "Unknown"
        status_counts[status] = status_counts.get(status, 0) + 1

    converted = status_counts.get("Converted", 0)
    return schemas.KPICard(
        total_leads=total,
        new_leads=status_counts.get("New Lead", 0),
        follow_up_required=status_counts.get("Follow-up Required", 0),
        interested=status_counts.get("Interested", 0),
        booked=status_counts.get("Booked", 0),
        converted=converted,
        cancelled=status_counts.get("Cancelled", 0),
        conversion_rate=round((converted / total * 100), 2) if total > 0 else 0.0
    )


@router.get("/trend", summary="Lead Trend Over Time")
def get_trend(
    days: int = Query(30, ge=7, le=365, description="Number of past days to analyze"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Returns daily lead counts over the past N days for trend charts."""
    from sqlalchemy import or_
    from datetime import datetime

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    q = db.query(models.Lead).filter(
        models.Lead.is_deleted == False,
        models.Lead.date_of_inquiry >= start_date,
        models.Lead.date_of_inquiry <= end_date
    )
    if current_user.role == models.UserRole.sales_personnel:
        q = q.filter(
            or_(
                models.Lead.salesperson_id == current_user.id,
                models.Lead.created_by == current_user.id
            )
        )

    leads = q.all()

    # Group by date
    trend: dict = {}
    current = start_date
    while current <= end_date:
        trend[str(current)] = 0
        current += timedelta(days=1)

    for lead in leads:
        day = str(lead.date_of_inquiry)
        if day in trend:
            trend[day] += 1

    return {
        "start_date": str(start_date),
        "end_date": str(end_date),
        "trend": [{"date": k, "count": v} for k, v in trend.items()]
    }
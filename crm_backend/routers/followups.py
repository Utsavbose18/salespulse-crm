from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from security import get_current_active_user, get_current_admin
import models
import schemas

router = APIRouter()


def _get_followup_or_404(followup_id: int, db: Session) -> models.FollowUp:
    followup = db.query(models.FollowUp).filter(models.FollowUp.id == followup_id).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return followup


# ─────────────────────────────────────────────
# CREATE FOLLOW-UP
# ─────────────────────────────────────────────

@router.post("/", response_model=schemas.FollowUpResponse, status_code=201, summary="Schedule Follow-Up")
def create_followup(
    followup_data: schemas.FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Schedule a follow-up for a lead with date, time, and notes."""
    # Verify lead exists
    lead = db.query(models.Lead).filter(
        models.Lead.id == followup_data.lead_id,
        models.Lead.is_deleted == False
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Sales personnel can only add follow-ups to their own leads
    if current_user.role == models.UserRole.sales_personnel:
        if lead.salesperson_id != current_user.id and lead.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied for this lead")

    followup = models.FollowUp(
        **followup_data.dict(),
        created_by=current_user.id
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)
    return followup


# ─────────────────────────────────────────────
# LIST FOLLOW-UPS
# ─────────────────────────────────────────────

@router.get("/", response_model=schemas.FollowUpListResponse, summary="List Follow-Ups")
def list_followups(
    lead_id: Optional[int] = Query(None, description="Filter by lead ID"),
    status: Optional[models.FollowUpStatus] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """List all follow-ups. Sales personnel see only their own."""
    query = db.query(models.FollowUp)

    if current_user.role == models.UserRole.sales_personnel:
        query = query.filter(models.FollowUp.created_by == current_user.id)

    if lead_id:
        query = query.filter(models.FollowUp.lead_id == lead_id)
    if status:
        query = query.filter(models.FollowUp.status == status)
    if date_from:
        query = query.filter(models.FollowUp.follow_up_date >= date_from)
    if date_to:
        query = query.filter(models.FollowUp.follow_up_date <= date_to)

    query = query.order_by(models.FollowUp.follow_up_date.asc())

    total = query.count()
    followups = query.offset(skip).limit(limit).all()
    return schemas.FollowUpListResponse(total=total, followups=followups)


# ─────────────────────────────────────────────
# GET UPCOMING FOLLOW-UPS (Calendar / Reminders)
# ─────────────────────────────────────────────

@router.get("/upcoming", response_model=schemas.FollowUpListResponse, summary="Upcoming Follow-Ups")
def get_upcoming_followups(
    days_ahead: int = Query(7, ge=1, le=90, description="Number of days to look ahead"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Retrieve upcoming follow-ups within the specified number of days (default: 7 days)."""
    from datetime import timedelta
    now = datetime.utcnow()
    future = now + timedelta(days=days_ahead)

    query = db.query(models.FollowUp).filter(
        models.FollowUp.follow_up_date >= now,
        models.FollowUp.follow_up_date <= future,
        models.FollowUp.status == models.FollowUpStatus.pending
    )

    if current_user.role == models.UserRole.sales_personnel:
        query = query.filter(models.FollowUp.created_by == current_user.id)

    query = query.order_by(models.FollowUp.follow_up_date.asc())
    followups = query.all()
    return schemas.FollowUpListResponse(total=len(followups), followups=followups)


# ─────────────────────────────────────────────
# GET SINGLE FOLLOW-UP
# ─────────────────────────────────────────────

@router.get("/{followup_id}", response_model=schemas.FollowUpResponse, summary="Get Follow-Up")
def get_followup(
    followup_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    followup = _get_followup_or_404(followup_id, db)
    if current_user.role == models.UserRole.sales_personnel and followup.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    return followup


# ─────────────────────────────────────────────
# UPDATE FOLLOW-UP
# ─────────────────────────────────────────────

@router.put("/{followup_id}", response_model=schemas.FollowUpResponse, summary="Update Follow-Up")
def update_followup(
    followup_id: int,
    followup_data: schemas.FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update follow-up details including rescheduling or marking complete."""
    followup = _get_followup_or_404(followup_id, db)
    if current_user.role == models.UserRole.sales_personnel and followup.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    update_data = followup_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(followup, key, value)

    db.commit()
    db.refresh(followup)
    return followup


# ─────────────────────────────────────────────
# MARK COMPLETE
# ─────────────────────────────────────────────

@router.patch("/{followup_id}/complete", response_model=schemas.FollowUpResponse, summary="Mark Follow-Up as Complete")
def mark_followup_complete(
    followup_id: int,
    notes: Optional[str] = Query(None, description="Optional completion notes"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mark a follow-up as completed."""
    followup = _get_followup_or_404(followup_id, db)
    if current_user.role == models.UserRole.sales_personnel and followup.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    followup.status = models.FollowUpStatus.completed
    if notes:
        followup.notes = notes
    db.commit()
    db.refresh(followup)
    return followup


# ─────────────────────────────────────────────
# DELETE FOLLOW-UP
# ─────────────────────────────────────────────

@router.delete("/{followup_id}", response_model=schemas.MessageResponse, summary="Delete Follow-Up")
def delete_followup(
    followup_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    followup = _get_followup_or_404(followup_id, db)
    if current_user.role == models.UserRole.sales_personnel and followup.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    db.delete(followup)
    db.commit()
    return schemas.MessageResponse(message=f"Follow-up ID {followup_id} deleted successfully.")
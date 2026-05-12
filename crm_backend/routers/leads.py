from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import date
from database import get_db
from security import get_current_active_user, get_current_admin
import models
import schemas

router = APIRouter()


def _get_lead_or_404(lead_id: int, db: Session) -> models.Lead:
    lead = db.query(models.Lead).filter(
        models.Lead.id == lead_id,
        models.Lead.is_deleted == False
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def _check_lead_access(lead: models.Lead, current_user: models.User):
    """Sales personnel can only access their own leads."""
    if current_user.role == models.UserRole.sales_personnel:
        if lead.salesperson_id != current_user.id and lead.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied for this lead")


# ─────────────────────────────────────────────
# CREATE LEAD
# ─────────────────────────────────────────────

@router.post("/", response_model=schemas.LeadResponse, status_code=201, summary="Create New Lead")
def create_lead(
    lead_data: schemas.LeadCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Sales Personnel / Admin: Enter a new lead into the system."""
    # Basic duplicate check by phone + name
    existing = db.query(models.Lead).filter(
        models.Lead.phone_number == lead_data.phone_number,
        models.Lead.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A lead with phone {lead_data.phone_number} already exists (ID: {existing.id})"
        )

    # Validate salesperson exists (if provided)
    if lead_data.salesperson_id:
        sp = db.query(models.User).filter(models.User.id == lead_data.salesperson_id).first()
        if not sp:
            raise HTTPException(status_code=404, detail="Assigned salesperson not found")

    data = lead_data.dict()

    # if salesperson not provided → assign current user
    if not data.get("salesperson_id"):
        data["salesperson_id"] = current_user.id

    lead = models.Lead(
        **data,
        created_by=current_user.id
    )
    db.add(lead)
    db.flush()

    # Record initial status
    history = models.LeadStatusHistory(
        lead_id=lead.id,
        changed_by=current_user.id,
        old_status_id=None,
        new_status_id=lead.lead_status_id,
        remarks="Lead created"
    )
    db.add(history)
    db.commit()
    db.refresh(lead)
    return lead


# ─────────────────────────────────────────────
# LIST LEADS (with filtering, search, pagination)
# ─────────────────────────────────────────────

@router.get("/", response_model=schemas.LeadListResponse, summary="List Leads")
def list_leads(
    # Search
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    # Filters
    lead_status_id: Optional[int] = Query(None),
    lead_source_id: Optional[int] = Query(None),
    lead_type_id: Optional[int] = Query(None),
    salesperson_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    # Pagination
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    # Sorting
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="asc or desc"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    List leads with filtering, searching, and pagination.
    Sales personnel see only their own leads.
    Admin sees all leads.
    """
    query = db.query(models.Lead).filter(models.Lead.is_deleted == False)

    # Role-based filtering
    if current_user.role == models.UserRole.sales_personnel:
        query = query.filter(
            or_(
                models.Lead.salesperson_id == current_user.id,
                models.Lead.created_by == current_user.id
            )
        )

    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Lead.name.ilike(search_term),
                models.Lead.phone_number.ilike(search_term),
                models.Lead.email.ilike(search_term)
            )
        )

    # Filters
    if lead_status_id:
        query = query.filter(models.Lead.lead_status_id == lead_status_id)

    if lead_source_id:
        query = query.filter(models.Lead.lead_source_id == lead_source_id)

    if lead_type_id:
        query = query.filter(models.Lead.lead_type_id == lead_type_id)
    if salesperson_id:
        query = query.filter(models.Lead.salesperson_id == salesperson_id)
    if date_from:
        query = query.filter(models.Lead.date_of_inquiry >= date_from)
    if date_to:
        query = query.filter(models.Lead.date_of_inquiry <= date_to)

    # Sorting
    sort_field = getattr(models.Lead, sort_by, models.Lead.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_field.desc())
    else:
        query = query.order_by(sort_field.asc())

    total = query.count()
    offset = (page - 1) * page_size
    leads = query.offset(offset).limit(page_size).all()

    return schemas.LeadListResponse(
        total=total,
        page=page,
        page_size=page_size,
        leads=leads
    )

@router.get("/lead-sources")
def list_sources(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return db.query(models.LeadSource).filter_by(is_active=True).all()


@router.get("/lead-statuses")
def list_lead_statuses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return db.query(models.LeadStatus).filter_by(is_active=True).all()


@router.get("/lead-types")
def list_lead_types(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return db.query(models.LeadType).filter_by(is_active=True).all()


# ─────────────────────────────────────────────
# GET SINGLE LEAD
# ─────────────────────────────────────────────

@router.get("/{lead_id}", response_model=schemas.LeadResponse, summary="Get Lead by ID")
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    lead = _get_lead_or_404(lead_id, db)
    _check_lead_access(lead, current_user)
    return lead

@router.post("/lead-sources")
def create_lead_source(
    data: schemas.DropdownCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    existing = db.query(models.LeadSource).filter_by(name=data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Source already exists")

    item = models.LeadSource(name=data.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item




@router.delete("/lead-sources/{id}")
def delete_source(
    id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    source = db.query(models.LeadSource).get(id)

    if not source:
        raise HTTPException(status_code=404, detail="Not found")

    db.delete(source)
    db.commit()

    return {"message": "Source disabled"}



@router.post("/lead-statuses")
def create_lead_status(
    data: schemas.DropdownCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    existing = db.query(models.LeadStatus).filter_by(name=data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Lead status already exists")

    status = models.LeadStatus(name=data.name)
    db.add(status)
    db.commit()
    db.refresh(status)

    return status



@router.delete("/lead-statuses/{id}")
def delete_lead_status(
    id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    status = db.query(models.LeadStatus).get(id)

    if not status:
        raise HTTPException(status_code=404, detail="Lead status not found")

    db.delete(status)
    db.commit()

    return {"message": "Lead status permanently deleted"}


@router.post("/lead-types")
def create_lead_type(
    data: schemas.DropdownCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    existing = db.query(models.LeadType).filter_by(name=data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Lead type already exists")

    lead_type = models.LeadType(name=data.name)
    db.add(lead_type)
    db.commit()
    db.refresh(lead_type)

    return lead_type



@router.delete("/lead-types/{id}")
def delete_lead_type(
    id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    lead_type = db.query(models.LeadType).get(id)

    if not lead_type:
        raise HTTPException(status_code=404, detail="Lead type not found")

    db.delete(lead_type)
    db.commit()

    return {"message": "Lead type disabled"}

# ─────────────────────────────────────────────
# UPDATE LEAD
# ─────────────────────────────────────────────

@router.put("/{lead_id}", response_model=schemas.LeadResponse, summary="Update Lead")
def update_lead(
    lead_id: int,
    lead_data: schemas.LeadUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update lead information. Status changes are tracked in history."""
    lead = _get_lead_or_404(lead_id, db)
    _check_lead_access(lead, current_user)

    update_data = lead_data.dict(exclude_unset=True)

    # Track status change separately
    if "lead_status_id" in update_data and update_data["lead_status_id"] != lead.lead_status_id:
        history = models.LeadStatusHistory(
            lead_id=lead.id,
            changed_by=current_user.id,
            old_status_id=lead.lead_status_id,
            new_status_id=update_data["lead_status_id"],
            remarks=update_data.get("remarks", "Status updated")
        )
        db.add(history)

    for key, value in update_data.items():
        setattr(lead, key, value)

    db.commit()
    db.refresh(lead)
    return lead


# ─────────────────────────────────────────────
# UPDATE LEAD STATUS ONLY
# ─────────────────────────────────────────────

@router.patch("/{lead_id}/status", response_model=schemas.LeadResponse, summary="Update Lead Status")
def update_lead_status(
    lead_id: int,
    status_data: schemas.LeadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Quick endpoint to update only the lead status with a remarks note."""
    lead = _get_lead_or_404(lead_id, db)
    _check_lead_access(lead, current_user)

    old_status = lead.lead_status_id
    lead.lead_status_id = status_data.lead_status_id

    history = models.LeadStatusHistory(
        lead_id=lead.id,
        changed_by=current_user.id,
        old_status_id=old_status,
        new_status_id=status_data.lead_status_id,
        remarks=status_data.remarks
    )
    db.add(history)
    db.commit()
    db.refresh(lead)
    return lead


# ─────────────────────────────────────────────
# GET STATUS HISTORY
# ─────────────────────────────────────────────

@router.get("/{lead_id}/history", response_model=list[schemas.StatusHistoryResponse], summary="Lead Status History")
def get_lead_history(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Returns the full status change history for a lead."""
    lead = _get_lead_or_404(lead_id, db)
    _check_lead_access(lead, current_user)
    return lead.status_history


# ─────────────────────────────────────────────
# SOFT DELETE LEAD
# ─────────────────────────────────────────────

@router.delete("/{lead_id}", response_model=schemas.MessageResponse, summary="Delete Lead (Admin)")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    lead = _get_lead_or_404(lead_id, db)

    # delete value adders linked to this lead
    db.query(models.ValueAdder).filter(models.ValueAdder.lead_id == lead_id).delete()

    db.delete(lead)
    db.commit()

    return schemas.MessageResponse(
        message=f"Lead '{lead.name}' (ID: {lead_id}) deleted successfully."
    )
# -------------------------
# DROPDOWN ROUTES FIRST
# -------------------------


# -------------------------
# THEN dynamic routes
# -------------------------


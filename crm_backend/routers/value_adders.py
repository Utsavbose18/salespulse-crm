from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ValueAdder, Lead
from schemas import (
    ValueAdderCreate,
    ValueAdderResponse,
    ValueAdderListResponse,
    ValueAdderUpdate
)

router = APIRouter()


# Create Value Adder
@router.post("/", response_model=ValueAdderResponse)
def create_value_adder(value_adder: ValueAdderCreate, db: Session = Depends(get_db)):

    lead = db.query(Lead).filter(Lead.id == value_adder.lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    new_value_adder = ValueAdder(
        lead_id=value_adder.lead_id,
        initial_call=value_adder.initial_call,
        call_script=value_adder.call_script,
        sms=value_adder.sms,
        whatsapp=value_adder.whatsapp,
        email=value_adder.email,
        video_content=value_adder.video_content,
        case_study=value_adder.case_study,
        testimonial=value_adder.testimonial,
        newsletter=value_adder.newsletter,
        created_by=1
    )

    db.add(new_value_adder)
    db.commit()
    db.refresh(new_value_adder)

    return new_value_adder


# Get Value Adders for a Lead
@router.get("/{lead_id}", response_model=ValueAdderListResponse)
def get_value_adders(lead_id: int, db: Session = Depends(get_db)):

    value_adders = db.query(ValueAdder).filter(ValueAdder.lead_id == lead_id).all()

    return {
        "total": len(value_adders),
        "value_adders": value_adders
    }


# Update Checklist
@router.put("/{value_adder_id}", response_model=ValueAdderResponse)
def update_value_adder(
    value_adder_id: int,
    update_data: ValueAdderUpdate,
    db: Session = Depends(get_db)
):

    value_adder = db.query(ValueAdder).filter(ValueAdder.id == value_adder_id).first()

    if not value_adder:
        raise HTTPException(status_code=404, detail="Value Adder not found")

    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(value_adder, key, value)

    db.commit()
    db.refresh(value_adder)

    return value_adder


# Delete Value Adder
@router.delete("/{value_adder_id}")
def delete_value_adder(value_adder_id: int, db: Session = Depends(get_db)):

    value_adder = db.query(ValueAdder).filter(ValueAdder.id == value_adder_id).first()

    if not value_adder:
        raise HTTPException(status_code=404, detail="Value Adder not found")

    db.delete(value_adder)
    db.commit()

    return {"message": "Value Adder deleted successfully"}
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    Enum, ForeignKey, Date, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    sales_personnel = "sales_personnel"


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class LeadSource(Base):
    __tablename__ = "lead_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeadStatus(Base):
    __tablename__ = "lead_statuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeadType(Base):
    __tablename__ = "lead_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FollowUpStatus(str, enum.Enum):
    pending = "Pending"
    completed = "Completed"
    rescheduled = "Rescheduled"


# ─────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.sales_personnel, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    leads_assigned = relationship("Lead", back_populates="salesperson", foreign_keys="Lead.salesperson_id")
    leads_created = relationship("Lead", back_populates="created_by_user", foreign_keys="Lead.created_by")
    followups = relationship("FollowUp", back_populates="created_by_user")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    # Personal Info
    name = Column(String(100), nullable=False, index=True)
    age = Column(Integer, nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    phone_number = Column(String(20), nullable=False)
    email = Column(String(100), nullable=True, index=True)
    date_of_inquiry = Column(Date, nullable=False)

    # Lead Details
    purpose_of_inquiry = Column(Text, nullable=True)
    lead_source_id = Column(Integer, ForeignKey("lead_sources.id"))
    lead_status_id = Column(Integer, ForeignKey("lead_statuses.id"), index=True)
    lead_type_id = Column(Integer, ForeignKey("lead_types.id"))
    remarks = Column(Text, nullable=True)
    lead_source = relationship("LeadSource")
    lead_status = relationship("LeadStatus")
    lead_type = relationship("LeadType")

    # Assignment
    salesperson_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)  # Soft delete

    # Relationships
    salesperson = relationship("User", back_populates="leads_assigned", foreign_keys=[salesperson_id])
    created_by_user = relationship("User", back_populates="leads_created", foreign_keys=[created_by])
    followups = relationship("FollowUp", back_populates="lead", cascade="all, delete-orphan")
    status_history = relationship("LeadStatusHistory", back_populates="lead", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Lead(id={self.id}, name={self.name}, status={self.lead_status})>"


class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    follow_up_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)
    reminder_sent = Column(Boolean, default=False)
    status = Column(Enum(FollowUpStatus), default=FollowUpStatus.pending)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    lead = relationship("Lead", back_populates="followups")
    created_by_user = relationship("User", back_populates="followups")

    def __repr__(self):
        return f"<FollowUp(id={self.id}, lead_id={self.lead_id}, date={self.follow_up_date})>"


class LeadStatusHistory(Base):
    __tablename__ = "lead_status_history"

    id = Column(Integer, primary_key=True, index=True)

    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    old_status_id = Column(Integer, ForeignKey("lead_statuses.id"), nullable=True)
    new_status_id = Column(Integer, ForeignKey("lead_statuses.id"), nullable=False)

    remarks = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="status_history")
    user = relationship("User")

    old_status = relationship("LeadStatus", foreign_keys=[old_status_id])
    new_status = relationship("LeadStatus", foreign_keys=[new_status_id])

    def __repr__(self):
        return f"<LeadStatusHistory(lead_id={self.lead_id}, {self.old_status} → {self.new_status})>"
    
    
# ─────────────────────────────────────────────
# VALUE ADDER MODEL
# ─────────────────────────────────────────────

class ValueAdder(Base):
    __tablename__ = "value_adders"

    id = Column(Integer, primary_key=True, index=True)

    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)

    # Checklist fields
    initial_call = Column(Boolean, default=False)
    call_script = Column(Boolean, default=False)
    sms = Column(Boolean, default=False)
    whatsapp = Column(Boolean, default=False)
    email = Column(Boolean, default=False)
    video_content = Column(Boolean, default=False)
    case_study = Column(Boolean, default=False)
    testimonial = Column(Boolean, default=False)
    newsletter = Column(Boolean, default=False)

    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead")    
    
    
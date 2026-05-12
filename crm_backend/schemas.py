from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime, date
from models import UserRole, Gender, LeadStatus, LeadSource, LeadType, FollowUpStatus


# ─────────────────────────────────────────────
# TOKEN / AUTH SCHEMAS
# ─────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class DropdownResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# ─────────────────────────────────────────────
# USER SCHEMAS
# ─────────────────────────────────────────────

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.sales_personnel


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

    @validator("password")
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    total: int
    users: List[UserResponse]


# ─────────────────────────────────────────────
# LEAD SCHEMAS
# ─────────────────────────────────────────────

class LeadBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[Gender] = None
    phone_number: str = Field(..., min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    date_of_inquiry: date
    purpose_of_inquiry: Optional[str] = None
    lead_source_id: int
    lead_status_id: int
    lead_type_id: int
    remarks: Optional[str] = None
    salesperson_id: Optional[int] = None


class LeadCreate(BaseModel):
    name: str
    phone_number: str
    date_of_inquiry: date

    lead_source_id: int
    lead_status_id: int
    lead_type_id: int

    # ── these were missing ──
    age: Optional[int] = None
    gender: Optional[Gender] = None
    email: Optional[EmailStr] = None
    purpose_of_inquiry: Optional[str] = None
    remarks: Optional[str] = None

    salesperson_id: Optional[int] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[Gender] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    date_of_inquiry: Optional[date] = None
    purpose_of_inquiry: Optional[str] = None
    lead_source_id: Optional[int] = None
    lead_status_id: Optional[int] = None
    lead_type_id: Optional[int] = None
    remarks: Optional[str] = None
    salesperson_id: Optional[int] = None


class LeadStatusUpdate(BaseModel):
    lead_status_id: int
    remarks: Optional[str] = None


class SalespersonInfo(BaseModel):
    id: int
    full_name: str
    username: str

    class Config:
        from_attributes = True


class LeadResponse(BaseModel):
    id: int
    name: str
    phone_number: str
    email: Optional[str]
    gender: Optional[Gender]
    age: Optional[int]
    date_of_inquiry: date
    purpose_of_inquiry: Optional[str]

    lead_source_id: int
    lead_status_id: int
    lead_type_id: int

    salesperson_id: Optional[int]   # keep this

    salesperson: Optional[SalespersonInfo]  # add this

    remarks: Optional[str]
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class LeadListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    leads: List[LeadResponse]

class DropdownCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

# ─────────────────────────────────────────────
# FOLLOW-UP SCHEMAS
# ─────────────────────────────────────────────

class FollowUpBase(BaseModel):
    lead_id: int
    follow_up_date: datetime
    notes: Optional[str] = None
    status: FollowUpStatus = FollowUpStatus.pending


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpUpdate(BaseModel):
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[FollowUpStatus] = None
    reminder_sent: Optional[bool] = None


class FollowUpResponse(FollowUpBase):
    id: int
    created_by: int
    reminder_sent: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FollowUpListResponse(BaseModel):
    total: int
    followups: List[FollowUpResponse]


# ─────────────────────────────────────────────
# STATUS HISTORY SCHEMAS
# ─────────────────────────────────────────────

class StatusHistoryResponse(BaseModel):
    id: int
    lead_id: int
    changed_by: int
    old_status_id: Optional[int]
    new_status_id: int
    remarks: Optional[str]
    changed_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# DASHBOARD / ANALYTICS SCHEMAS
# ─────────────────────────────────────────────

class KPICard(BaseModel):
    total_leads: int
    new_leads: int
    follow_up_required: int
    interested: int
    booked: int
    converted: int
    cancelled: int
    conversion_rate: float


class LeadsBySource(BaseModel):
    source: str
    count: int


class LeadsByStatus(BaseModel):
    status: str
    count: int


class LeadsByType(BaseModel):
    lead_type: str
    count: int


class SalespersonPerformance(BaseModel):
    salesperson_id: int
    full_name: str
    total_leads: int
    converted: int
    conversion_rate: float


class DashboardResponse(BaseModel):
    kpi: KPICard
    leads_by_source: List[LeadsBySource]
    leads_by_status: List[LeadsByStatus]
    leads_by_type: List[LeadsByType]
    salesperson_performance: List[SalespersonPerformance]


# ─────────────────────────────────────────────
# GENERIC RESPONSE
# ─────────────────────────────────────────────
    
    
# ─────────────────────────────────────────────
# VALUE ADDER SCHEMAS
# ─────────────────────────────────────────────

class ValueAdderCreate(BaseModel):
    lead_id: int
    initial_call: Optional[bool] = False
    call_script: Optional[bool] = False
    sms: Optional[bool] = False
    whatsapp: Optional[bool] = False
    email: Optional[bool] = False
    video_content: Optional[bool] = False
    case_study: Optional[bool] = False
    testimonial: Optional[bool] = False
    newsletter: Optional[bool] = False


class ValueAdderResponse(BaseModel):
    id: int
    lead_id: int
    initial_call: bool
    call_script: bool
    sms: bool
    whatsapp: bool
    email: bool
    video_content: bool
    case_study: bool
    testimonial: bool
    newsletter: bool
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class ValueAdderListResponse(BaseModel):
    total: int
    value_adders: List[ValueAdderResponse]


class ValueAdderUpdate(BaseModel):
    initial_call: Optional[bool] = None
    call_script: Optional[bool] = None
    sms: Optional[bool] = None
    whatsapp: Optional[bool] = None
    email: Optional[bool] = None
    video_content: Optional[bool] = None
    case_study: Optional[bool] = None
    testimonial: Optional[bool] = None
    newsletter: Optional[bool] = None    



class MessageResponse(BaseModel):
    message: str
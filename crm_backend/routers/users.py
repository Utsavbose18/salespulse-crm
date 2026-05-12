from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from security import get_current_admin, get_current_active_user, get_password_hash
import models
import schemas

router = APIRouter()


@router.post("/", response_model=schemas.UserResponse, status_code=201, summary="Create User (Admin)")
def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin)
):
    """Admin only: Create a new user account with role assignment."""
    # Check duplicates
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_data.password)
    user = models.User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=schemas.UserListResponse, summary="List All Users (Admin)")
def list_users(
    role: Optional[models.UserRole] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    """Admin only: List all users with optional filtering."""
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)

    total = query.count()
    users = query.offset(skip).limit(limit).all()
    return schemas.UserListResponse(total=total, users=users)


@router.get("/{user_id}", response_model=schemas.UserResponse, summary="Get User by ID")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get user by ID. Admin can view any user; sales personnel can view only themselves."""
    if current_user.role != models.UserRole.admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=schemas.UserResponse, summary="Update User (Admin)")
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    """Admin only: Update user details, role, or active status."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", response_model=schemas.MessageResponse, summary="Reset Password (Admin)")
def reset_password(
    user_id: int,
    password_data: schemas.UserPasswordReset,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    """Admin only: Reset a user's password."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return schemas.MessageResponse(message=f"Password for {user.username} has been reset successfully.")


@router.patch("/{user_id}/toggle-active", response_model=schemas.UserResponse, summary="Toggle User Active Status (Admin)")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin)
):
    """Admin only: Enable or disable a user account."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    action = "activated" if user.is_active else "deactivated"
    return user


@router.delete("/{user_id}", response_model=schemas.MessageResponse, summary="Delete User (Admin)")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin)
):
    """Admin only: Permanently delete a user account."""
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return schemas.MessageResponse(message=f"User '{user.username}' deleted successfully.")
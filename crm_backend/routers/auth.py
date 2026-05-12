from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from security import verify_password, create_access_token, get_current_user
import models
import schemas

router = APIRouter()


@router.post("/login", response_model=schemas.Token, summary="User Login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate user with username and password.
    Returns a JWT access token along with user role info.
    """
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact admin."
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        full_name=user.full_name
    )


@router.get("/me", response_model=schemas.UserResponse, summary="Get Current User")
def get_me(current_user: models.User = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return current_user
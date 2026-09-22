"""
@file routes_auth.py
@description FastAPI authentication and session routes.
Implements secure bcrypt credential verification and 12-hour statutory duty JWT sessions.
Designed specifically for Legal Metrology officers on continuous field inspections (offline-tolerant)
and Indian consumers checking fair pricing without disruptive mid-audit session drops.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import create_user, get_user_by_email, list_demo_users
from app.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Access Control"])


@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Register a new Consumer or Officer account",
)
async def register(payload: UserRegisterRequest):
    """
    Registers a new account and returns a 12-hour statutory duty session token.
    - Consumers: Citizen users verifying packaging compliance.
    - Officers: Legal Metrology Inspectors conducting enforcement drives.
    """
    existing = await get_user_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in.",
        )

    user_id = f"usr-{uuid.uuid4().hex[:12]}"
    pw_hash = hash_password(payload.password)

    user_row = await create_user(
        user_id=user_id,
        email=payload.email,
        hashed_password=pw_hash,
        full_name=payload.full_name,
        role=payload.role,
        organization=payload.organization,
        badge_number=payload.badge_number,
    )

    user_resp = UserResponse(
        id=user_row["id"],
        email=user_row["email"],
        full_name=user_row["full_name"],
        role=user_row["role"],
        organization=user_row.get("organization"),
        badge_number=user_row.get("badge_number"),
        created_at=str(user_row["created_at"]) if user_row.get("created_at") else None,
    )

    access_token = create_access_token({"sub": user_resp.id, "role": user_resp.role})
    return TokenResponse(access_token=access_token, token_type="bearer", expires_in=43200, user=user_resp)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in with email and password",
)
async def login(payload: UserLoginRequest):
    """
    Authenticates credentials and issues a secure 12-hour duty session JWT.
    Enables officers to conduct long market raids without mid-audit timeouts or complex refresh race conditions.
    """
    user_row = await get_user_by_email(payload.email)
    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )

    if not verify_password(payload.password, user_row["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )

    user_resp = UserResponse(
        id=user_row["id"],
        email=user_row["email"],
        full_name=user_row["full_name"],
        role=user_row["role"],
        organization=user_row.get("organization"),
        badge_number=user_row.get("badge_number"),
        created_at=str(user_row["created_at"]) if user_row.get("created_at") else None,
    )

    access_token = create_access_token({"sub": user_resp.id, "role": user_resp.role})
    return TokenResponse(access_token=access_token, token_type="bearer", expires_in=43200, user=user_resp)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get authenticated user profile",
)
async def get_profile(user: Annotated[UserResponse | None, Depends(get_current_user)]):
    """Retrieves profile of the currently logged-in user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
        )
    return user


@router.get(
    "/demo-users",
    summary="List pre-seeded demo accounts for 1-click testing",
)
async def get_demo_users():
    """
    Returns pre-configured demo users to allow hackathon judges and testers
    to instantly switch between Citizen Consumer, Enforcement Officer, and Ministry Admin.
    """
    users = await list_demo_users()
    demo_list = []
    for u in users:
        pw_hint = (
            "Consumer@123"
            if u["role"] == "CONSUMER"
            else ("Officer@123" if u["role"] == "OFFICER" else "Admin@123")
        )
        demo_list.append({**u, "demoPassword": pw_hint})
    return {"demoUsers": demo_list}

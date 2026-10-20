"""
Endpoint CRUD API endpoints.

This file contains all endpoints for managing monitoring endpoints.
Since we're not implementing authentication yet (Phase 5), these endpoints
are public for now. In Phase 5, we'll add authentication middleware.

LEARNING EXERCISE:
- Try sending invalid data to POST /api/endpoints (e.g., invalid URL)
- What error message do you get? (Pydantic provides detailed validation errors)
- Try updating an endpoint that doesn't exist - what happens?
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Endpoint, User
from app.schemas import EndpointCreate, EndpointUpdate, EndpointResponse

router = APIRouter(prefix="/api/endpoints", tags=["endpoints"])


@router.post("/", response_model=EndpointResponse, status_code=status.HTTP_201_CREATED)
def create_endpoint(endpoint: EndpointCreate, db: Session = Depends(get_db)):
    """
    Create a new monitoring endpoint.

    For now, we use a default user_id=1 since auth isn't implemented yet.
    In Phase 5, we'll get the user_id from the JWT token.
    """
    # TODO: In Phase 5, get user_id from JWT token
    # For now, create or get a default user
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(email="default@example.com", password_hash="temp", name="Default User")
        db.add(user)
        db.commit()
        db.refresh(user)

    db_endpoint = Endpoint(
        user_id=user.id,
        name=endpoint.name,
        url=str(endpoint.url),
        method=endpoint.method,
        headers=endpoint.headers,
        body=endpoint.body,
        expected_status=endpoint.expected_status,
        check_interval=endpoint.check_interval,
        is_active=True
    )
    db.add(db_endpoint)
    db.commit()
    db.refresh(db_endpoint)
    return db_endpoint


@router.get("/", response_model=List[EndpointResponse])
def list_endpoints(db: Session = Depends(get_db)):
    """
    List all endpoints.

    For now, returns all endpoints. In Phase 5, we'll filter by user_id.
    """
    endpoints = db.query(Endpoint).all()
    return endpoints


@router.get("/{endpoint_id}", response_model=EndpointResponse)
def get_endpoint(endpoint_id: int, db: Session = Depends(get_db)):
    """
    Get a specific endpoint by ID.
    """
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint with id {endpoint_id} not found"
        )
    return endpoint


@router.put("/{endpoint_id}", response_model=EndpointResponse)
def update_endpoint(endpoint_id: int, endpoint_update: EndpointUpdate, db: Session = Depends(get_db)):
    """
    Update an existing endpoint.
    """
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint with id {endpoint_id} not found"
        )

    # Update only provided fields
    update_data = endpoint_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "url" and value is not None:
            setattr(endpoint, field, str(value))
        elif value is not None:
            setattr(endpoint, field, value)

    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_endpoint(endpoint_id: int, db: Session = Depends(get_db)):
    """
    Delete an endpoint.
    """
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint with id {endpoint_id} not found"
        )

    db.delete(endpoint)
    db.commit()
    return None

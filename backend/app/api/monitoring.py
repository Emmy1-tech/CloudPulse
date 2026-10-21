"""
Monitoring and incident management API endpoints.

This file handles:
- Manual endpoint checks
- Monitoring results retrieval
- Statistics calculation
- Incident management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Literal
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import Endpoint, MonitoringResult, Incident
from app.schemas import MonitoringResultResponse, EndpointStats, IncidentUpdate

router = APIRouter(prefix="/api/endpoints", tags=["monitoring"])


@router.post("/{endpoint_id}/check", response_model=MonitoringResultResponse)
def trigger_check(
    endpoint_id: int,
    force_status: Literal["success", "failure"] | None = None,
    db: Session = Depends(get_db),
):
    """
    Trigger an immediate health check for an endpoint.

    This is a SIMULATED check for demonstration purposes.
    In production, this would make a real HTTP request to the endpoint.
    
    force_status: Optional parameter to force a specific status ('success' or 'failure')
    """
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint with id {endpoint_id} not found"
        )
    if not endpoint.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Endpoint is disabled; enable it before running a check",
        )

    # SIMULATED health check
    # In production, replace this with actual HTTP request logic
    import random
    
    # Use forced status if provided, otherwise simulate random
    if force_status == "success":
        is_success = True
    elif force_status == "failure":
        is_success = False
    else:
        # Default: 80% success rate
        is_success = random.random() < 0.8
    
    status_code = endpoint.expected_status if is_success else 500
    response_time = random.uniform(50, 500)  # 50-500ms
    error_message = None if is_success else "Simulated failure for demonstration"

    # Create monitoring result
    result = MonitoringResult(
        endpoint_id=endpoint_id,
        status="success" if is_success else "failure",
        status_code=status_code,
        response_time=response_time,
        error_message=error_message
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    # Create incident if failed and no open incident exists
    if not is_success:
        open_incident = db.query(Incident).filter(
            Incident.endpoint_id == endpoint_id,
            Incident.status.in_(["open", "acknowledged"])
        ).first()
        
        if not open_incident:
            incident = Incident(
                endpoint_id=endpoint_id,
                status="open"
            )
            db.add(incident)
            db.commit()

    return result


@router.get("/{endpoint_id}/results", response_model=List[MonitoringResultResponse])
def get_monitoring_results(
    endpoint_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10000),
    db: Session = Depends(get_db)
):
    """Get monitoring history for an endpoint."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint with id {endpoint_id} not found"
        )

    results = db.query(MonitoringResult).filter(
        MonitoringResult.endpoint_id == endpoint_id
    ).order_by(MonitoringResult.checked_at.desc()).limit(limit).offset(offset).all()

    return results


@router.get("/{endpoint_id}/stats", response_model=EndpointStats)
def get_endpoint_stats(endpoint_id: int, db: Session = Depends(get_db)):
    """Get statistics for an endpoint."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint with id {endpoint_id} not found"
        )

    results = db.query(MonitoringResult).filter(
        MonitoringResult.endpoint_id == endpoint_id
    ).all()

    total_checks = len(results)
    if total_checks == 0:
        return EndpointStats(
            total_checks=0,
            success_count=0,
            failure_count=0,
            success_rate=0.0,
            avg_response_time=None,
            uptime_percentage=0.0
        )

    success_count = sum(1 for r in results if r.status == "success")
    failure_count = total_checks - success_count
    success_rate = (success_count / total_checks) * 100

    response_times = [r.response_time for r in results if r.response_time is not None]
    avg_response_time = sum(response_times) / len(response_times) if response_times else None

    # Calculate uptime percentage (last 24 hours)
    cutoff_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    recent_results = [r for r in results if r.checked_at >= cutoff_time]
    if recent_results:
        recent_success = sum(1 for r in recent_results if r.status == "success")
        uptime_percentage = (recent_success / len(recent_results)) * 100
    else:
        uptime_percentage = success_rate

    return EndpointStats(
        total_checks=total_checks,
        success_count=success_count,
        failure_count=failure_count,
        success_rate=round(success_rate, 2),
        avg_response_time=(
            round(avg_response_time, 2) if avg_response_time is not None else None
        ),
        uptime_percentage=round(uptime_percentage, 2)
    )


@router.get("/{endpoint_id}/incidents")
def get_endpoint_incidents(endpoint_id: int, db: Session = Depends(get_db)):
    """Get incidents for an endpoint."""
    endpoint = db.query(Endpoint).filter(Endpoint.id == endpoint_id).first()
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Endpoint with id {endpoint_id} not found"
        )

    incidents = db.query(Incident).filter(
        Incident.endpoint_id == endpoint_id
    ).order_by(Incident.created_at.desc()).all()

    return [
        {
            "id": i.id,
            "endpoint_id": i.endpoint_id,
            "status": i.status,
            "created_at": i.created_at.isoformat(),
            "updated_at": i.updated_at.isoformat(),
            "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None
        }
        for i in incidents
    ]


@router.put("/incidents/{incident_id}")
def update_incident(
    incident_id: int,
    update_data: IncidentUpdate,
    db: Session = Depends(get_db)
):
    """Update incident status (acknowledge or resolve)."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with id {incident_id} not found"
        )

    incident.status = update_data.status
    if update_data.status == "resolved":
        incident.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    db.refresh(incident)

    return {
        "id": incident.id,
        "endpoint_id": incident.endpoint_id,
        "status": incident.status,
        "created_at": incident.created_at.isoformat(),
        "updated_at": incident.updated_at.isoformat(),
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None
    }

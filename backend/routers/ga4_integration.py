import os
import pandas as pd
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import SessionLocal, User, Company, PageVisit, AuditLog
from auth import get_current_user
from ga4_clustering import GA4SegmentationPipeline

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/status")
def get_tracker_status(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if company and company.measurement_id:
        return {"linked": True, "property_id": company.measurement_id}
    return {"linked": False}

@router.post("/generate")
def regenerate_tracker(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    import uuid
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if company:
        company.measurement_id = 'SF-' + uuid.uuid4().hex[:8].upper()
        # Delete old visits
        db.query(PageVisit).filter(PageVisit.company_id == company.id).delete()
        
        db.add(AuditLog(
            user_id=current_user.id,
            company_id=current_user.company_id,
            action="Regenerated GA4 Engine Tracker",
            details=f"New Measurement ID: {company.measurement_id}"
        ))
        
        db.commit()
    return {"message": "Measurement ID Regenerated & Data Cleared"}

@router.get("/data")
def get_tracker_data(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company or not company.measurement_id:
        raise HTTPException(status_code=400, detail="Tracker not connected")
        
    # Fetch real-time data: visits within the last 5 minutes
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    visits = db.query(PageVisit).filter(
        PageVisit.company_id == company.id,
        PageVisit.timestamp >= cutoff
    ).all()
    
    if not visits:
        # If no data yet, return mock structure or empty
        return {
            "segments": [],
            "trends": []
        }

    data = []
    for v in visits:
        # simplify referrers (simulate organic/direct logic)
        source = "direct / (none)"
        if v.referrer:
            if "google" in v.referrer: source = "google / organic"
            elif "bing" in v.referrer: source = "bing / organic"
            elif "facebook" in v.referrer: source = "facebook / referral"
            elif "twitter" in v.referrer: source = "twitter / social"
            else: source = "referral"
            
        data.append({
            "date": v.timestamp.strftime("%Y%m%d"),
            "source_medium": source,
            "session_id": v.session_id,
        })
        
    df = pd.DataFrame(data)
    
    # Group by date and source_medium, and count unique visits
    grouped = df.groupby(["date", "source_medium"]).agg(
        active_users=("session_id", "nunique"),
        sessions=("session_id", "count"),
    ).reset_index()
    
    # Mock some basic events count (page load = events)
    grouped["event_count"] = grouped["sessions"] * 2 
    
    pipeline = GA4SegmentationPipeline(grouped)
    segments_df, trend_df = pipeline.run_clustering()
    
    return {
        "segments": segments_df.to_dict(orient="records"),
        "trends": trend_df.to_dict(orient="records")
    }

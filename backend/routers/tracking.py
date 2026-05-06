from fastapi import APIRouter, Depends, Request, Response, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

from database import SessionLocal, Company, PageVisit, CustomEvent

router = APIRouter()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# The JavaScript snippet served to users
ANALYTICS_SCRIPT = """
(function(window, document, endpoint) {
    // Generate a simple session ID if one doesn't exist
    function getSessionId() {
        let sid = sessionStorage.getItem('sf_sid');
        if (!sid) {
            sid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('sf_sid', sid);
        }
        return sid;
    }
    
    // Function to send data to the backend
    function sendData(measurementId, eventName, eventData) {
        if (!measurementId) return;
        
        const payload = {
            measurement_id: measurementId,
            session_id: getSessionId(),
            event_name: eventName,
            url: window.location.href,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent
        };
        
        if (eventData) {
            payload.event_data = JSON.stringify(eventData);
        }
        
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            mode: 'cors',
            keepalive: true
        }).catch(err => console.warn('SegmentFlow warning:', err));
    }
    
    // Create the global tracker object
    window.segmentFlow = function() {
        const args = Array.prototype.slice.call(arguments);
        if (args.length === 0) return;
        
        if (args[0] === 'config') {
            window.segmentFlow.measurementId = args[1];
            // Automatically send pageview on config
            sendData(window.segmentFlow.measurementId, 'page_view');
        } else if (args[0] === 'event') {
            sendData(window.segmentFlow.measurementId, args[1], args[2]);
        }
    };
    
})(window, document, 'http://localhost:8000/api/tracking/collect');
"""

@router.get("/analytics.js")
def get_analytics_script():
    return Response(content=ANALYTICS_SCRIPT, media_type="application/javascript")


class TrackingPayload(BaseModel):
    measurement_id: str
    session_id: str
    event_name: str
    url: str
    referrer: Optional[str] = None
    user_agent: Optional[str] = None
    event_data: Optional[str] = None

@router.post("/collect")
def collect_event(payload: TrackingPayload, request: Request, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.measurement_id == payload.measurement_id).first()
    
    if not company:
        # Silently drop invalid measurement IDs to prevent errors on the client's public website
        return {"status": "ignored", "reason": "invalid_measurement_id"}
    
    if payload.event_name == "page_view":
        # Record a page visit
        visit = PageVisit(
            company_id=company.id,
            session_id=payload.session_id,
            url=payload.url,
            referrer=payload.referrer,
            user_agent=payload.user_agent,
            timestamp=datetime.utcnow()
        )
        db.add(visit)
    else:
        # Record a custom event
        event = CustomEvent(
            company_id=company.id,
            session_id=payload.session_id,
            event_name=payload.event_name,
            event_data=payload.event_data,
            timestamp=datetime.utcnow()
        )
        db.add(event)
        
    db.commit()
    return {"status": "success"}

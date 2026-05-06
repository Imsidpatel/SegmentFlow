from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import AuditLog, User, Company, Customer, Transaction, DatabaseConnection, GoogleCredentials, PageVisit, CustomEvent
from auth import get_super_admin_user, get_db

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Dashboard"],
    dependencies=[Depends(get_super_admin_user)]
)

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    # Calculate details
    users = db.query(User.id, User.email, Company.name.label("company_name"))\
        .outerjoin(Company, User.company_id == Company.id)\
        .filter(User.is_super_admin == False).all()
        
    companies = db.query(Company.id, Company.name, Company.industry, Company.location)\
        .filter(Company.name != "SegmentFlow System Admin").all()
        
    # Count customers per company
    customer_breakdown = db.query(Company.name, func.count(Customer.id).label("count"))\
        .outerjoin(Customer, Company.id == Customer.company_id)\
        .filter(Company.name != "SegmentFlow System Admin")\
        .group_by(Company.name).all()
        
    total_customers = sum(cb.count for cb in customer_breakdown)
    
    return {
        "total_analysts": len(users),
        "total_clients": len(companies),
        "total_insights_generated": total_customers,
        "analysts_list": [{"id": u.id, "email": u.email, "workspace": u.company_name} for u in users],
        "clients_list": [{"id": c.id, "name": c.name, "industry": c.industry or "N/A"} for c in companies],
        "customers_breakdown": [{"workspace": cb.name, "count": cb.count} for cb in customer_breakdown]
    }

@router.delete("/workspaces/{company_id}")
def delete_workspace(company_id: int, db: Session = Depends(get_db)):
    # Safely cascade delete to avoid SQL relation errors
    db.query(Transaction).filter(Transaction.company_id == company_id).delete(synchronize_session=False)
    db.query(Customer).filter(Customer.company_id == company_id).delete(synchronize_session=False)
    db.query(DatabaseConnection).filter(DatabaseConnection.company_id == company_id).delete(synchronize_session=False)
    db.query(GoogleCredentials).filter(GoogleCredentials.company_id == company_id).delete(synchronize_session=False)
    db.query(PageVisit).filter(PageVisit.company_id == company_id).delete(synchronize_session=False)
    db.query(CustomEvent).filter(CustomEvent.company_id == company_id).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.company_id == company_id).delete(synchronize_session=False)
    db.query(User).filter(User.company_id == company_id).delete(synchronize_session=False)
    db.query(Company).filter(Company.id == company_id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Workspace successfully deleted"}

@router.delete("/analysts/{user_id}")
def delete_analyst(user_id: int, db: Session = Depends(get_db)):
    db.query(AuditLog).filter(AuditLog.user_id == user_id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Analyst successfully deleted"}


@router.get("/logs")
def get_audit_logs(db: Session = Depends(get_db)):
    # Join AuditLog with User and Company to get readable emails/names
    logs = db.query(
        AuditLog.id, 
        AuditLog.action, 
        AuditLog.details, 
        AuditLog.timestamp, 
        User.email.label("user_email"), 
        Company.name.label("company_name")
    )\
    .outerjoin(User, AuditLog.user_id == User.id)\
    .outerjoin(Company, AuditLog.company_id == Company.id)\
    .order_by(AuditLog.timestamp.desc())\
    .limit(100).all()
    
    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp,
            "user_email": log.user_email or "Unknown",
            "company_name": log.company_name or "Unknown",
        }
        for log in logs
    ]

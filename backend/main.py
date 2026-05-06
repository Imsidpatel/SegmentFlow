from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from io import BytesIO
import pandas as pd
import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

from database import SessionLocal, engine, Base, User, Company, Customer, Transaction, AuditLog
from etl_rfm import SegmentFlowPipeline
from report_generator import generate_pdf_report
from auth import get_current_user, verify_password, get_password_hash, create_access_token


# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SegmentFlow API")

@app.on_event("startup")
def create_default_admin():
    db = SessionLocal()
    try:
        admin_email = "admin@gmail.com"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_company = Company(name="SegmentFlow System Admin")
            db.add(admin_company)
            db.commit()
            db.refresh(admin_company)
            
            hashed_pw = get_password_hash("segmentflowadmin")
            new_admin = User(
                email=admin_email,
                hashed_password=hashed_pw,
                company_id=admin_company.id,
                is_super_admin=True
            )
            db.add(new_admin)
            db.commit()
    finally:
        db.close()


# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import data_sources
from routers import ga4_integration
from routers import tracking
from routers import admin

app.include_router(data_sources.router, prefix="/api/data-sources", tags=["data-sources"])
app.include_router(ga4_integration.router, prefix="/api/ga4", tags=["ga4"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["tracking"])
app.include_router(admin.router)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class TransactionUpdate(BaseModel):
    id: str  
    customer_id: str
    amount: float
    date: str

class CompanyOnboarding(BaseModel):
    industry: str
    company_size: str
    business_structure: str
    location: str
    primary_objective: str

@app.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_company = Company(name=f"{user.name}'s Workspace")
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    
    hashed_pw = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_pw,
        company_id=new_company.id
    )
    db.add(new_user)
    db.commit()
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "is_super_admin": user.is_super_admin
    }

@app.put("/company/onboarding")
def update_company_onboarding(
    data: CompanyOnboarding,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company.industry = data.industry
    company.company_size = data.company_size
    company.business_structure = data.business_structure
    company.location = data.location
    company.primary_objective = data.primary_objective
    
    db.commit()
    return {"message": "Onboarding details saved successfully"}

@app.get("/users/me")
def read_users_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company_name = company.name if company else "Unknown Workspace"
    
    # We didn't save the raw name field on the User, so we extract it back out 
    # from the Workspace name or default to the email username
    user_name = company_name.replace("'s Workspace", "")
    if company_name == user_name: 
        user_name = current_user.email.split("@")[0].title()
        
    return {
        "email": current_user.email,
        "name": user_name,
        "company_name": company_name,
        "is_super_admin": current_user.is_super_admin,
        "industry": company.industry if company else None,
        "company_size": company.company_size if company else None,
        "business_structure": company.business_structure if company else None,
        "location": company.location if company else None,
        "primary_objective": company.primary_objective if company else None
    }

@app.get("/")
def read_root():
    return {"status": "SegmentFlow API is running"}

@app.post("/upload-data/")
async def upload_data(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        company_id = current_user.company_id
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")
        
        # 1. Run the Pipeline
        pipeline = SegmentFlowPipeline(df, company_id=company_id)
        pipeline.calculate_rfm()
        clustered_df = pipeline.run_clustering(k=5)
        
        # 2. Persist to Database Permanently (Upsert)
        for index, row in clustered_df.iterrows():
            email_str = f"customer_{row['customer_id']}@example.com"
            
            existing_customer = db.query(Customer).filter(
                Customer.company_id == company_id,
                Customer.email == email_str
            ).first()

            if existing_customer:
                existing_customer.recency = row['Recency']
                existing_customer.frequency = row['Frequency']
                existing_customer.monetary = row['Monetary']
                existing_customer.segment = row['Segment']
                existing_customer.clv_prediction = row['Monetary'] * 1.5
                existing_customer.churn_probability = 0.8 if row['Segment'] in ['At Risk', 'Hibernating'] else 0.1
            else:
                new_customer = Customer(
                    company_id=company_id,
                    email=email_str,
                    name=f"Customer {row['customer_id']}",
                    recency=row['Recency'],
                    frequency=row['Frequency'],
                    monetary=row['Monetary'],
                    segment=row['Segment'],
                    clv_prediction=row['Monetary'] * 1.5,
                    churn_probability=0.8 if row['Segment'] in ['At Risk', 'Hibernating'] else 0.1
                )
                db.add(new_customer)
            
        db.commit()
        
        # 3. Persist Transactions
        db.query(Transaction).filter(Transaction.company_id == company_id).delete()
        db.commit()
        
        customers = db.query(Customer).filter(Customer.company_id == company_id).all()
        customer_map = {c.name.replace("Customer ", ""): c.id for c in customers}
        
        transactions_to_insert = []
        for index, row in pipeline.clean_df.iterrows():
            raw_cid = str(row.get('customer_id', ''))
            db_cid = customer_map.get(raw_cid)
            if db_cid:
                t_date = row.get('date')
                if pd.isna(t_date):
                    t_date = None
                else:
                    t_date = t_date.to_pydatetime()
                    
                transactions_to_insert.append(Transaction(
                    company_id=company_id,
                    customer_id=db_cid,
                    transaction_ref=str(row.get('transaction_id', '')),
                    amount=float(row.get('amount', 0)),
                    date=t_date
                ))
        if transactions_to_insert:
            db.add_all(transactions_to_insert)
            db.commit()
            
        db.add(AuditLog(
            user_id=current_user.id,
            company_id=current_user.company_id,
            action="Uploaded CSV Data",
            details=f"Processed {len(clustered_df)} rows"
        ))
        db.commit()
        
        return {"message": "Data processed successfully", "rows_processed": len(clustered_df)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/transactions/")
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company_id = current_user.company_id
    transactions = db.query(Transaction).filter(Transaction.company_id == company_id).order_by(Transaction.date.desc()).limit(100).all()
    
    return [
        {
            "id": t.transaction_ref if t.transaction_ref else f"TRX-{t.id}",
            "customer_id": t.customer.name.replace("Customer ", "") if t.customer else f"CUST-{t.customer_id}",
            "amount": t.amount,
            "date": t.date.strftime("%Y-%m-%d") if t.date else "N/A"
        }
        for t in transactions
    ]

@app.post("/transactions/")
def create_transaction(
    tx: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    company_id = current_user.company_id
    
    customer = db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.name.ilike(f"%{tx.customer_id}%")
    ).first()
    
    if not customer:
        customer = Customer(
            company_id=company_id,
            email=f"{tx.customer_id.lower()}@example.com",
            name=tx.customer_id,
            recency=0,
            frequency=0,
            monetary=0,
            segment="New Customers",
            churn_probability=0.1,
            clv_prediction=tx.amount
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
    date_obj = datetime.strptime(tx.date, "%Y-%m-%d") if tx.date else datetime.utcnow()
    
    new_t = Transaction(
        company_id=company_id,
        customer_id=customer.id,
        transaction_ref=tx.id,
        amount=tx.amount,
        date=date_obj
    )
    db.add(new_t)
    db.commit()
    return {"message": "Transaction created"}

@app.put("/transactions/{transaction_ref}")
def update_transaction(
    transaction_ref: str,
    tx: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    company_id = current_user.company_id
    t = db.query(Transaction).filter(
        Transaction.company_id == company_id, 
        Transaction.transaction_ref == transaction_ref
    ).first()
    
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    customer = db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.name.ilike(f"%{tx.customer_id}%")
    ).first()
    
    if not customer:
        customer = Customer(
            company_id=company_id,
            email=f"{tx.customer_id.lower()}@example.com",
            name=tx.customer_id
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    t.customer_id = customer.id
    t.transaction_ref = tx.id
    t.amount = tx.amount
    t.date = datetime.strptime(tx.date, "%Y-%m-%d") if tx.date else datetime.utcnow()
    
    db.commit()
    return {"message": "Transaction updated"}

@app.delete("/transactions/{transaction_ref}")
def delete_transaction(
    transaction_ref: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company_id = current_user.company_id
    t = db.query(Transaction).filter(
        Transaction.company_id == company_id, 
        Transaction.transaction_ref == transaction_ref
    ).first()
    
    if t:
        db.delete(t)
        db.commit()
    return {"message": "Transaction deleted"}

@app.post("/recalculate-models/")
def recalculate_models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company_id = current_user.company_id
    
    transactions = db.query(Transaction).filter(Transaction.company_id == company_id).all()
    if not transactions:
        db.query(Customer).filter(Customer.company_id == company_id).delete(synchronize_session=False)
        db.commit()
        return {"message": "No data"}
        
    data = []
    for t in transactions:
        data.append({
            'customer_id': t.customer_id,
            'transaction_id': t.transaction_ref,
            'amount': t.amount,
            'date': t.date
        })
        
    df = pd.DataFrame(data)
    
    pipeline = SegmentFlowPipeline(df, company_id=company_id)
    pipeline.calculate_rfm()
    clustered_df = pipeline.run_clustering(k=5)
    
    for index, row in clustered_df.iterrows():
        existing_customer = db.query(Customer).filter(
            Customer.id == row['customer_id']
        ).first()

        if existing_customer:
            existing_customer.recency = row['Recency']
            existing_customer.frequency = row['Frequency']
            existing_customer.monetary = row['Monetary']
            existing_customer.segment = row['Segment']
            existing_customer.clv_prediction = row['Monetary'] * 1.5
            existing_customer.churn_probability = 0.8 if row['Segment'] in ['At Risk', 'Hibernating'] else 0.1
            
    # Purge orphaned customers that no longer have active transactions in the cluster calculations
    active_customer_ids = clustered_df['customer_id'].tolist()
    db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.id.notin_(active_customer_ids)
    ).delete(synchronize_session=False)
            
    db.commit()
    return {"message": "Models recalculated successfully"}

@app.get("/customers/")
def get_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company_id = current_user.company_id
    """
    Fetch all customers for the current tenant.
    """
    customers = db.query(Customer).filter(Customer.company_id == company_id).all()
    # Format for the React frontend
    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "segment": c.segment,
            "clv": c.clv_prediction,
            "risk": "High" if c.churn_probability and c.churn_probability > 0.5 else "Low",
            "lastActive": f"{int(c.recency)} days ago" if c.recency else "N/A",
            "recency": c.recency,
            "frequency": c.frequency,
            "monetary": c.monetary
        }
        for c in customers
    ]

@app.get("/generate-report/")
def get_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company_id = current_user.company_id
    """
    Generates a PDF report and returns the file path. (For demo purposes)
    """
    customers = db.query(Customer).filter(Customer.company_id == company_id).all()
    # Rebuild dataframe for the report generator
    data = []
    for c in customers:
        data.append({
            'customer_id': c.id,
            'Segment': c.segment,
            'Monetary': c.monetary
        })
    df = pd.DataFrame(data)
    
    if df.empty:
        raise HTTPException(status_code=400, detail="No data available to generate report.")
    
    report_path = os.path.join(os.getcwd(), f"report_company_{company_id}.pdf")
    generate_pdf_report("Mock Company LLC", df, report_path)
    
    db.add(AuditLog(
        user_id=current_user.id,
        company_id=current_user.company_id,
        action="Downloaded Report",
        details=f"Generated PDF report for {len(df)} customers."
    ))
    db.commit()
    
    return {"message": "Report generated", "path": report_path}

@app.delete("/clear-data/")
def clear_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company_id = current_user.company_id
    try:
        db.query(Transaction).filter(Transaction.company_id == company_id).delete()
        db.query(Customer).filter(Customer.company_id == company_id).delete()
        db.commit()
        return {"message": "All workspace data cleared successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)



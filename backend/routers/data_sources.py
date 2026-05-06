from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from typing import Optional
import pandas as pd

from database import DatabaseConnection, SessionLocal, Customer, Transaction, User
from auth import get_current_user
from etl_rfm import SegmentFlowPipeline

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DatabaseConnectionCreate(BaseModel):
    name: str
    db_type: str
    host: str
    port: int
    username: str
    password: str
    database_name: str

@router.post("")
def create_data_source(
    data: DatabaseConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_conn = DatabaseConnection(
        company_id=current_user.company_id,
        name=data.name,
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        username=data.username,
        password=data.password,
        database_name=data.database_name
    )
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)
    return new_conn

@router.get("")
def list_data_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sources = db.query(DatabaseConnection).filter(DatabaseConnection.company_id == current_user.company_id).all()
    # Return sources safely without passwords
    return [
        {
            "id": s.id,
            "name": s.name,
            "db_type": s.db_type,
            "host": s.host,
            "port": s.port,
            "username": s.username,
            "database_name": s.database_name
        } for s in sources
    ]

def build_connection_url(conn: DatabaseConnection):
    if conn.db_type == 'postgres':
        return f"postgresql+psycopg2://{conn.username}:{conn.password}@{conn.host}:{conn.port}/{conn.database_name}"
    elif conn.db_type == 'mysql':
        return f"mysql+pymysql://{conn.username}:{conn.password}@{conn.host}:{conn.port}/{conn.database_name}"
    else:
        raise ValueError("Unsupported database type")

@router.post("/{id}/test")
def test_data_source(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn = db.query(DatabaseConnection).filter(DatabaseConnection.id == id, DatabaseConnection.company_id == current_user.company_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    try:
        url = build_connection_url(conn)
        engine = create_engine(url)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "success", "message": "Connection successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

class ImportRequest(BaseModel):
    table_name: Optional[str] = None
    query: Optional[str] = None

@router.post("/{id}/import")
def import_from_data_source(
    id: int,
    request: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn = db.query(DatabaseConnection).filter(DatabaseConnection.id == id, DatabaseConnection.company_id == current_user.company_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
        
    try:
        url = build_connection_url(conn)
        engine = create_engine(url)
        
        if request.table_name:
            df = pd.read_sql_table(request.table_name, engine)
        elif request.query:
            df = pd.read_sql_query(request.query, engine)
        else:
            raise HTTPException(status_code=400, detail="Must provide either table_name or query")
        
        pipeline = SegmentFlowPipeline(df, company_id=current_user.company_id)
        pipeline.calculate_rfm()
        clustered_df = pipeline.run_clustering(k=5)
        
        company_id = current_user.company_id
        
        # 2. Persist to Database Permanently
        existing_customers = db.query(Customer).filter(Customer.company_id == company_id).all()
        customer_map_by_email = {c.email: c for c in existing_customers}

        new_customers = []
        for index, row in clustered_df.iterrows():
            email_str = f"customer_{row['customer_id']}@example.com"
            existing_customer = customer_map_by_email.get(email_str)

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
                new_customers.append(new_customer)
                customer_map_by_email[email_str] = new_customer # Add to dictionary just in case of duplicates
            
        if new_customers:
            db.add_all(new_customers)
            
        db.commit()
        
        # 3. Persist Transactions
        db.query(Transaction).filter(Transaction.company_id == company_id).delete()
        db.commit()
        
        customers = db.query(Customer).filter(Customer.company_id == company_id).all()
        customer_map = {c.name.replace("Customer ", ""): c.id for c in customers}
        
        transactions_to_insert = []
        for row in pipeline.clean_df.to_dict(orient='records'):
            raw_cid = str(row.get('customer_id', ''))
            db_cid = customer_map.get(raw_cid)
            if db_cid:
                t_date = row.get('date')
                if pd.isna(t_date):
                    t_date = None
                else:
                    try:
                        t_date = t_date.to_pydatetime()
                    except:
                        t_date = None
                    
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

        return {"message": "Data imported successfully", "rows_processed": len(clustered_df)}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{id}")
def delete_data_source(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn = db.query(DatabaseConnection).filter(DatabaseConnection.id == id, DatabaseConnection.company_id == current_user.company_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    db.delete(conn)
    db.commit()
    return {"message": "Connection deleted successfully"}

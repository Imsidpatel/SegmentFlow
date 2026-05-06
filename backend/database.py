from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./segmentflow.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    industry = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    business_structure = Column(String, nullable=True)
    location = Column(String, nullable=True)
    primary_objective = Column(String, nullable=True)
    measurement_id = Column(String, unique=True, index=True, nullable=True)
    
    # Relationships
    users = relationship("User", back_populates="company")
    customers = relationship("Customer", back_populates="company")
    database_connections = relationship("DatabaseConnection", back_populates="company")
    google_credentials = relationship("GoogleCredentials", back_populates="company", uselist=False)
    page_visits = relationship("PageVisit", back_populates="company")
    custom_events = relationship("CustomEvent", back_populates="company")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_super_admin = Column(Boolean, default=False)
    
    company = relationship("Company", back_populates="users")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))  # STRICT ISOLATION
    email = Column(String, index=True)
    name = Column(String)
    
    # RFM & ML fields
    recency = Column(Float, nullable=True)
    frequency = Column(Integer, nullable=True)
    monetary = Column(Float, nullable=True)
    segment = Column(String, nullable=True) # e.g. "Champions", "At Risk"
    churn_probability = Column(Float, nullable=True)
    clv_prediction = Column(Float, nullable=True)
    
    company = relationship("Company", back_populates="customers")
    transactions = relationship("Transaction", back_populates="customer")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))  # STRICT ISOLATION
    customer_id = Column(Integer, ForeignKey("customers.id"))
    transaction_ref = Column(String, index=True, nullable=True)
    amount = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="transactions")

class DatabaseConnection(Base):
    __tablename__ = "database_connections"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    name = Column(String)
    db_type = Column(String) # postgres, mysql
    host = Column(String)
    port = Column(Integer)
    username = Column(String)
    password = Column(String)
    database_name = Column(String)
    
    company = relationship("Company", back_populates="database_connections")

class GoogleCredentials(Base):
    __tablename__ = "google_credentials"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), unique=True)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    token_uri = Column(String, nullable=True)
    client_id = Column(String, nullable=True)
    client_secret = Column(String, nullable=True)
    property_id = Column(String, nullable=True)
    
    company = relationship("Company", back_populates="google_credentials")

class PageVisit(Base):
    __tablename__ = "page_visits"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    session_id = Column(String, index=True)
    url = Column(String)
    referrer = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="page_visits")

class CustomEvent(Base):
    __tablename__ = "custom_events"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    session_id = Column(String, index=True)
    event_name = Column(String, index=True)
    event_data = Column(String, nullable=True) # JSON payload
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="custom_events")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    action = Column(String)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    company = relationship("Company")

# Create all tables
Base.metadata.create_all(bind=engine)

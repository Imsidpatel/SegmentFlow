# SegmentFlow SaaS Technical Blueprint

## 1. Data Isolation Strategy and Database Schema
To ensure Company A's data never leaks into Company B's view, we use a **Shared Database, Shared Schema** multi-tenancy model secured via Row-Level Security (applied logically via the ORM). 
Every table must contain a `company_id` (Tenant ID). All API endpoints must extract the `company_id` from the current authenticated user's token and append a `WHERE company_id = ?` to every single query.

### Core Tables
1. **companies**: `id`, `name`, `industry`
2. **users** (Analysts): `id`, `company_id`, `email`, `password_hash`, `role`
3. **customers**: `id`, `company_id`, `email`, `name`, `segment`, `clv_prediction`, `churn_probability`
4. **transactions**: `id`, `company_id`, `customer_id`, `amount`, `date`

By mandating that our database interactors automatically inject `company_id`, we isolate the data.

## 2. Backend Directory Structure
We will use FastAPI for its performance, async support, and automatic OpenAPI documentation.
```
backend/
├── main.py                  # FastAPI application entry point
├── database.py              # SQLAlchemy Base, Engine, and Models
├── dependencies.py          # Auth functions (validating JWT -> User -> Company ID)
├── etl_rfm.py               # Automated ETL & ML Clustering logic (Pandas/Scikit-learn)
├── report_generator.py      # ReportLab PDF Generation
├── requirements.txt         # Dependencies (fastapi, pandas, scikit-learn, etc.)
└── routers/
    ├── auth.py              # Login and Registration
    ├── customers.py         # Customer listing and Nudge logic
    └── data_upload.py       # Handling CSV/Excel uploads
```

## 3. The ML Engine details
- **Clustering (K-Means)**: We log-transform the RFM scores to handle skewness in monetary values before applying K=5 KMeans.
- **Churn Target**: Simple Random Forest or XGBoost trained on features like Recency, Frequency, and Monetary trend to predict if they will buy in the next 30 days.

## 4. Next Best Action (NBA) Engine
We map segments to specific nudges.
- **Champions (High M, Low R)**: "Invite to VIP Loyalty Program"
- **At Risk (High M, High R)**: "Send 'We Miss You' 25% Discount"
- **New Customers (Low F, Low R)**: "Send Welcome Series & Cross-sell"
- **Hibernating (Low M, High R)**: "Don't spend ad dollars; trigger automated email only"

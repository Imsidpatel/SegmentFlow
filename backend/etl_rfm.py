import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from datetime import datetime

class SegmentFlowPipeline:
    def __init__(self, df: pd.DataFrame, company_id: int):
        self.raw_df = df
        self.company_id = company_id
        
    def _clean_data(self) -> pd.DataFrame:
        """Handle missing values, format dates, and identify columns dynamically."""
        df = self.raw_df.copy()
        
        # Standardize column names to lowercase with underscores
        df.columns = [str(c).lower().strip().replace(' ', '_') for c in df.columns]
        
        # --- Core Dynamic Column Detection ---
        
        # 1. Customer ID
        if 'customer_id' not in df.columns:
            for col in df.columns:
                if any(k in col for k in ['customer', 'client', 'user', 'account']) and 'id' in col:
                    df.rename(columns={col: 'customer_id'}, inplace=True)
                    break
            if 'customer_id' not in df.columns and len(df.columns) > 0:
                # Fallback to the first column assuming it's an identifier
                df.rename(columns={df.columns[0]: 'customer_id'}, inplace=True)

        # 2. Date
        if 'date' not in df.columns:
            for col in df.columns:
                if any(k in col for k in ['date', 'time', 'stamp', 'created']):
                    df.rename(columns={col: 'date'}, inplace=True)
                    break
            if 'date' not in df.columns:
                df['date'] = pd.Timestamp.now() # Fallback

        # 3. Transaction ID
        if 'transaction_id' not in df.columns:
            for col in df.columns:
                if any(k in col for k in ['transaction', 'invoice', 'order', 'receipt']) and ('id' in col or 'no' in col):
                    df.rename(columns={col: 'transaction_id'}, inplace=True)
                    break
            if 'transaction_id' not in df.columns:
                df['transaction_id'] = range(1, len(df) + 1) # Auto-generate

        # 4. Amount (Monetary Value)
        if 'amount' not in df.columns:
            # Check for direct synonyms
            for col in df.columns:
                if any(k in col for k in ['amount', 'revenue', 'total', 'sales', 'value']):
                    df.rename(columns={col: 'amount'}, inplace=True)
                    break
            
            # Check for computed features or fallbacks
            if 'amount' not in df.columns:
                price_col = next((c for c in df.columns if 'price' in c or 'rate' in c or 'cost' in c), None)
                qty_col = next((c for c in df.columns if 'quantity' in c or 'qty' in c or 'weight' in c or 'volume' in c or 'tons' in c), None)
                
                if price_col and qty_col:
                    df['amount'] = pd.to_numeric(df[price_col], errors='coerce').fillna(0) * pd.to_numeric(df[qty_col], errors='coerce').fillna(0)
                elif price_col:
                    df.rename(columns={price_col: 'amount'}, inplace=True)
                else:
                    # Fallback to the first numeric column
                    numeric_cols = df.select_dtypes(include=[np.number]).columns
                    valid_num = [c for c in numeric_cols if c not in ['customer_id', 'transaction_id'] and 'id' not in c]
                    if valid_num:
                        df.rename(columns={valid_num[0]: 'amount'}, inplace=True)
                    else:
                        df['amount'] = 1.0
        
        # Ensure minimum required columns exist
        required = {'customer_id', 'date', 'amount'}
        missing = required - set(df.columns)
        if missing:
            raise KeyError(f"Uploaded file is missing required columns: {missing}. Found columns: {list(df.columns)}")
        
        # 1. Drop complete duplicates
        df = df.drop_duplicates()
        
        # 2. Handle missing amounts
        if 'amount' in df.columns:
            # Ensure it's correctly parsed as numeric
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
            
        # 3. Format dates robustly
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            df = df.dropna(subset=['date']) # Drop rows where date parsing failed
            
        return df

    def calculate_rfm(self) -> pd.DataFrame:
        """Aggregate transaction data into RFM metrics per customer."""
        df = self._clean_data()
        
        # Current date for Recency calculation (use latest date in dataset + 1 to avoid 0)
        current_date = df['date'].max() + pd.Timedelta(days=1)
        
        # Aggregate by customer_id
        rfm = df.groupby('customer_id').agg({
            'date': lambda x: (current_date - x.max()).days,
            'transaction_id': 'count',
            'amount': 'sum'
        }).reset_index()
        
        rfm.rename(columns={
            'date': 'Recency',
            'transaction_id': 'Frequency',
            'amount': 'Monetary'
        }, inplace=True)
        
        # Handle zero or negative monetary for log transform safely (e.g. refunds might be negative)
        rfm['Monetary'] = rfm['Monetary'].clip(lower=1) # Set min value as 1
        
        self.clean_df = df
        self.rfm_df = rfm
        return rfm

    def run_clustering(self, k: int = 5) -> pd.DataFrame:
        """K-Means Clustering on Log-transformed RFM."""
        rfm = self.rfm_df.copy()
        
        # Log Transformation to handle right-skewed data
        rfm_log = rfm[['Recency', 'Frequency', 'Monetary']].apply(np.log1p)
        
        # Scale Data (standardization)
        # Note: In a real app add StandardScaler here from sklearn.preprocessing
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        rfm_scaled = scaler.fit_transform(rfm_log)
        
        # KMeans
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(rfm_scaled)
        
        # Assign cluster labels
        rfm['Cluster'] = kmeans.labels_
        
        # Calculate cluster centroids logically based on RFM mean
        cluster_means = rfm.groupby('Cluster')[['Recency', 'Frequency', 'Monetary']].mean()
        
        # Rank each metric (0 is lowest, 4 is highest)
        r_rank = cluster_means['Recency'].rank().astype(int) - 1
        fm_score = cluster_means['Frequency'].rank().astype(int) + cluster_means['Monetary'].rank().astype(int)
        
        unassigned_clusters = list(cluster_means.index)
        segment_map = {}
        
        if len(unassigned_clusters) >= 5:
            # 1. Champions: highest FM score among lowest half of Recency, or simply max FM score
            champions_c = sorted(unassigned_clusters, key=lambda c: (-fm_score[c], r_rank[c]))[0]
            segment_map[champions_c] = 'Champions'
            unassigned_clusters.remove(champions_c)
            
            # 2. Hibernating: lowest FM score overall, breaking ties with highest R
            hibernating_c = sorted(unassigned_clusters, key=lambda c: (fm_score[c], -r_rank[c]))[0]
            segment_map[hibernating_c] = 'Hibernating'
            unassigned_clusters.remove(hibernating_c)
            
            # 3. New Customers: Lowest Recency among remaining
            new_cust_c = sorted(unassigned_clusters, key=lambda c: r_rank[c])[0]
            segment_map[new_cust_c] = 'New Customers'
            unassigned_clusters.remove(new_cust_c)
            
            # 4. At Risk: Highest Recency among remaining
            at_risk_c = sorted(unassigned_clusters, key=lambda c: -r_rank[c])[0]
            segment_map[at_risk_c] = 'At Risk'
            unassigned_clusters.remove(at_risk_c)
            
            # 5. Regulars: The last one
            segment_map[unassigned_clusters[0]] = 'Regulars'
        else:
            # Fallback if there's less than 5 clusters for some reason
            segment_names = ['Regulars', 'Champions', 'At Risk', 'Hibernating', 'New Customers']
            segment_map = {i: segment_names[i % 5] for i in cluster_means.index}
            
        rfm['Segment'] = rfm['Cluster'].map(segment_map)
        return rfm

    def determine_next_best_action(self, segment: str):
        actions = {
            'Champions': 'Invite to VIP Loyalty Program',
            'At Risk': "Send 'We Miss You' 25% Discount",
            'New Customers': 'Send Welcome Series & Cross-sell',
            'Hibernating': "Don't spend ad dollars; trigger automated email only",
            'Regulars': 'Send Monthly Digest'
        }
        return actions.get(segment, 'No Action')

# Example Usage:
# df = pd.read_csv('uploaded_tenant_data.csv')
# pipeline = SegmentFlowPipeline(df, company_id=123)
# pipeline.calculate_rfm()
# clustered_customers = pipeline.run_clustering()

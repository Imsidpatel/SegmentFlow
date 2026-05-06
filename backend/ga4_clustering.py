import pandas as pd
import numpy as np
from sklearn.cluster import KMeans

class GA4SegmentationPipeline:
    def __init__(self, df: pd.DataFrame):
        self.raw_df = df
        
    def run_clustering(self, k: int = 3) -> pd.DataFrame:
        if self.raw_df.empty:
            return pd.DataFrame()
            
        # Segment traffic sources rather than individual users since GA4 API 
        # (without BigQuery exports) primarily grants aggregated data
        df_agg = self.raw_df.groupby("source_medium").agg({
            "active_users": "sum",
            "sessions": "sum",
            "event_count": "sum"
        }).reset_index()
        
        df_agg[['active_users', 'sessions', 'event_count']] = df_agg[['active_users', 'sessions', 'event_count']].clip(lower=1)
        
        metrics_log = df_agg[['active_users', 'sessions', 'event_count']].apply(np.log1p)
        
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        metrics_scaled = scaler.fit_transform(metrics_log)
        
        n_clusters = min(k, len(df_agg))
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        kmeans.fit(metrics_scaled)
        
        df_agg['Cluster'] = kmeans.labels_
        
        # Calculate cluster logic mapping (Event count per session is a good proxy for engagement)
        df_agg['events_per_session'] = df_agg['event_count'] / df_agg['sessions']
        cluster_means = df_agg.groupby("Cluster")["events_per_session"].mean().sort_values()
        
        if n_clusters >= 3:
            mapping = {
                cluster_means.index[0]: "Browsing (New)",
                cluster_means.index[1]: "Window Shoppers (At Risk)",
                cluster_means.index[2]: "Highly Engaged (Loyal)"
            }
        elif n_clusters == 2:
            mapping = {
                cluster_means.index[0]: "Window Shoppers",
                cluster_means.index[1]: "Highly Engaged"
            }
        else:
            mapping = {
                cluster_means.index[0]: "Highly Engaged"
            }
            
        df_agg['Segment'] = df_agg['Cluster'].map(mapping)
        
        # Generate some daily trend lines for the segments to show in UI
        # We need a summarized time-series dataframe
        time_series = self.raw_df.copy()
        # Ensure we can join back the segment
        segment_map = df_agg.set_index("source_medium")["Segment"].to_dict()
        time_series["Segment"] = time_series["source_medium"].map(segment_map)
        
        # Sum by date and segment
        trend_df = time_series.groupby(["date", "Segment"])["active_users"].sum().reset_index()
        
        return df_agg, trend_df

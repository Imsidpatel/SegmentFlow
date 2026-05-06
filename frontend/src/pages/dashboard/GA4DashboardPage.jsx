import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, ShieldCheck, RefreshCw, BarChart3, Users } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

export default function GA4DashboardPage() {
  const [status, setStatus] = useState({ linked: false, loading: true });
  const [data, setData] = useState({ segments: [], trends: [] });
  const [loadingData, setLoadingData] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    checkStatus();
  }, [searchParams]);

  const checkStatus = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/ga4/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus({ linked: data.linked, loading: false, property_id: data.property_id });
        if (data.linked) fetchData();
      }
    } catch (e) {
      console.error(e);
      setStatus({ linked: false, loading: false });
    }
  };

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/ga4/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleGenerateTracker = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    const token = sessionStorage.getItem('token');
    await fetch(import.meta.env.VITE_API_URL + '/api/ga4/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await checkStatus();
  };

  const pivotedTrends = React.useMemo(() => {
    if (!data.trends || data.trends.length === 0) return [];
    const grouped = {};
    data.trends.forEach(row => {
      // Format date for chart
      const formattedDate = row.date.length === 8 
         ? `${row.date.substring(4,6)}/${row.date.substring(6,8)}` 
         : row.date;
         
      if (!grouped[row.date]) grouped[row.date] = { dateStr: formattedDate, rawDate: row.date };
      grouped[row.date][row.Segment] = row.active_users;
    });
    return Object.values(grouped).sort((a,b) => a.rawDate.localeCompare(b.rawDate));
  }, [data.trends]);

  if (status.loading) return <div className="p-8">Loading GA4 Integration...</div>;

  if (!status.linked) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
        <div className="bg-slate-900 border border-slate-800 text-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <Activity className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4 tracking-tight">SegmentFlow Analytics</h2>
          <p className="text-slate-400 mb-8 leading-relaxed text-sm">
            Install the SegmentFlow tracker to start collecting data directly from your website. No external platforms needed.
          </p>
          <button 
            onClick={handleGenerateTracker}
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-white py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            disabled={status.loading}
          >
            <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {status.loading ? 'Generating...' : 'Enable Tracking'}
          </button>
        </div>
      </div>
    );
  }

  // Segment colors mapping
  const segmentColors = {
    "Highly Engaged (Loyal)": "#10b981",    // emerald-500
    "Window Shoppers (At Risk)": "#f43f5e", // rose-500
    "Browsing (New)": "#3b82f6",            // blue-500
    "Highly Engaged": "#10b981",
    "Window Shoppers": "#f43f5e",
    "Browsing": "#3b82f6",
  };
  
  const allSegments = Array.from(new Set(data.segments?.map(s => s.Segment) || []));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900 rounded-2xl p-6 text-white shadow-lg border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" /> Flow Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Property: {status.property_id}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSetup(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
            Tracker Setup
          </button>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-indigo-400' : ''}`} /> Refresh Data
          </button>
        </div>
      </div>

      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-24 text-indigo-600">
           <RefreshCw className="w-10 h-10 animate-spin mb-4" />
           <p className="font-medium animate-pulse">Running K-Means Clustering Models...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Scatter Chart (Clusters) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Channel Engagement Clusters
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="sessions" name="Sessions" tick={{fill: '#64748b', fontSize: 12}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} label={{ value: 'Total Sessions', position: 'bottom', fill: '#64748b', fontSize: 12, offset: -10 }} />
                  <YAxis type="number" dataKey="event_count" name="Events" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} label={{ value: 'Event Count', angle: -90, position: 'left', fill: '#64748b', fontSize: 12 }} />
                  <ZAxis type="category" dataKey="source_medium" name="Source/Medium" />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 text-white p-4 rounded-xl shadow-2xl">
                            <p className="font-bold text-indigo-400 mb-2 truncate max-w-[200px]">{data.source_medium}</p>
                            <div className="space-y-1 text-sm">
                                <p className="flex justify-between gap-4"><span className="text-slate-400">Segment</span> <span className="font-medium" style={{color: segmentColors[data.Segment]}}>{data.Segment}</span></p>
                                <p className="flex justify-between gap-4"><span className="text-slate-400">Sessions</span> <span className="font-medium">{data.sessions.toLocaleString()}</span></p>
                                <p className="flex justify-between gap-4"><span className="text-slate-400">Events</span> <span className="font-medium">{data.event_count.toLocaleString()}</span></p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {allSegments.map(segmentName => (
                    <Scatter 
                      key={segmentName}
                      name={segmentName} 
                      data={data.segments.filter(s => s.Segment === segmentName)} 
                      fill={segmentColors[segmentName] || "#6366f1"} 
                    />
                  ))}
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Segment Details Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> Key Profiles
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {data.segments?.sort((a,b)=>b.event_count - a.event_count).map((seg, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex justify-between items-start mb-2.5">
                    <span className="font-medium text-slate-800 text-sm truncate pr-2" title={seg.source_medium}>{seg.source_medium}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: `${segmentColors[seg.Segment]}15`, color: segmentColors[seg.Segment] || '#6366f1' }}>
                      {seg.Segment}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>{seg.active_users.toLocaleString()} Users</span>
                    <span className="text-slate-400 truncate pl-2">{(seg.event_count/seg.sessions).toFixed(1)} Evt/Vis</span>
                  </div>
                </div>
              ))}
              {(!data.segments || data.segments.length === 0) && (
                <div className="text-center text-slate-500 text-sm py-4">No segment data available</div>
              )}
            </div>
          </div>

          {/* Trend Line Chart */}
          <div className="lg:col-span-3 bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 overflow-hidden relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
             
             <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2 relative z-10">
                <Activity className="w-5 h-5 text-indigo-400" /> Trajectory by Cohort
             </h3>
             <div className="h-[320px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pivotedTrends} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="dateStr" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={{stroke: '#334155'}} tickLine={false} />
                    <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ fontSize: '13px', fontWeight: '500' }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
                    {allSegments.map(segmentName => (
                        <Line 
                            key={segmentName}
                            type="monotone" 
                            dataKey={segmentName} 
                            stroke={segmentColors[segmentName] || "#6366f1"} 
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

        </div>
      )}

      {showSetup && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">SegmentFlow Setup</h3>
              <button onClick={() => setShowSetup(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            <div className="p-6 text-slate-300 space-y-4">
              <p>Copy and paste this code snippet into the <code>&lt;head&gt;</code> of every page on your website you want to track.</p>
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-sm overflow-x-auto text-indigo-300">
{`<script src=import.meta.env.VITE_API_URL + "/api/tracking/analytics.js"></script>
<script>
  segmentFlow('config', '${status.property_id}');
</script>`}
              </div>
              <p className="text-xs text-slate-400">If you want to reset your tracking data and start fresh, regenerating your Measurement ID will clear all current records.</p>
              <button onClick={async () => { setShowSetup(false); await handleGenerateTracker(); }} className="mt-4 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Reset Tracking ID & Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

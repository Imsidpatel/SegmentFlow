import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Zap, Users, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PlotlyChart = ({ data, layout }) => {
  const plotRef = useRef(null);

  useEffect(() => {
    let checkPlotly = setInterval(() => {
      if (window.Plotly && plotRef.current) {
        window.Plotly.newPlot(plotRef.current, data, layout, { responsive: true });
        clearInterval(checkPlotly);
      }
    }, 100);
    return () => clearInterval(checkPlotly);
  }, [data, layout]);

  return <div ref={plotRef} className="w-full h-full" />;
};

export default function NextBestActionPage() {

  const [stats, setStats] = useState({ total: 0, lift: 0, priority: 0 });
  const [segmentData, setSegmentData] = useState([]);
  const [rawCustomerData, setRawCustomerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/customers/', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      
      if (res.status === 401) {
        sessionStorage.removeItem('token');
        window.location.href = '/auth';
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setRawCustomerData(data);
        const total = data.length;
        let lift = 0;
        let priority = 0;
        
        let atRisk = 0;
        let champions = 0;
        let hibernating = 0;
        let segmentsCount = { 'Champions': 0, 'At Risk': 0, 'New Customers': 0, 'Hibernating': 0, 'Regulars': 0 };

        data.forEach(c => {
          if (c.risk === 'High' && c.clv > 1000) priority++;
          
          if (segmentsCount[c.segment] !== undefined) {
            segmentsCount[c.segment]++;
          } else {
            segmentsCount['Regulars'] = (segmentsCount['Regulars'] || 0) + 1;
          }
          
          if (c.segment === 'At Risk') {
            atRisk++;
            lift += (c.clv * 0.15); 
          } else if (c.segment === 'Champions') {
            champions++;
            lift += (c.clv * 0.05);
          } else if (c.segment === 'Hibernating') {
            hibernating++;
            lift += 50; // Arbitrary cost saving
          }
        });

        setStats({ total, lift: Math.round(lift), priority });
        
        const chartData = [
          { name: 'Champions', value: segmentsCount['Champions'], color: '#10b981' }, 
          { name: 'At Risk', value: segmentsCount['At Risk'], color: '#f43f5e' }, 
          { name: 'New Customers', value: segmentsCount['New Customers'], color: '#3b82f6' }, 
          { name: 'Hibernating', value: segmentsCount['Hibernating'], color: '#64748b' }, 
          { name: 'Regulars', value: segmentsCount['Regulars'], color: '#6366f1' }, 
        ].filter(d => d.value > 0);
        setSegmentData(chartData);


      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRecalculateModels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/recalculate-models/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      if (!res.ok) {
        console.error("Failed to recalculate models on backend");
      }
    } catch (error) {
      console.error("Recalculation error:", error);
    }
    
    // Always fetch insights after attempting recalculation
    fetchInsights();
  };

  const render3DScatter = () => {
    if (rawCustomerData.length === 0) return null;

    const segmentColors = {
      'Champions': '#10b981',
      'At Risk': '#f43f5e',
      'New Customers': '#3b82f6',
      'Hibernating': '#64748b',
      'Regulars': '#6366f1'
    };

    // Group data by segment
    const grouped = {};
    rawCustomerData.forEach(c => {
      // Fallback defaults to 'Regulars' if no segment assigned somehow
      const seg = c.segment || 'Regulars';
      if (!grouped[seg]) {
        grouped[seg] = {
           x: [], // Recency
           y: [], // Frequency
           z: [], // Monetary
           text: []
        };
      }
      grouped[seg].x.push(c.recency || 0);
      grouped[seg].y.push(c.frequency || 0);
      grouped[seg].z.push(c.monetary || 0);
      grouped[seg].text.push(c.name || 'Unknown');
    });

    const plotData = Object.keys(grouped).map(segment => ({
      type: 'scatter3d',
      mode: 'markers',
      name: segment,
      x: grouped[segment].x,
      y: grouped[segment].y,
      z: grouped[segment].z,
      text: grouped[segment].text,
      marker: {
        size: 5,
        color: segmentColors[segment] || '#94a3b8',
        opacity: 0.8
      }
    }));

    return (
      <div style={{ width: '100%', height: '500px' }}>
        <PlotlyChart
          data={plotData}
          layout={{
            title: '',
            autosize: true,
            margin: { l: 0, r: 0, b: 0, t: 10 },
            scene: {
              xaxis: { title: 'Recency (Days)' },
              yaxis: { title: 'Frequency' },
              zaxis: { title: 'Monetary ($)' }
            },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            legend: { orientation: 'h', y: -0.1 }
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Intelligence Overview</h2>
          <p className="text-slate-500 mt-1">AI-driven insights based on your latest data sync.</p>
        </div>
        <button 
          onClick={handleRecalculateModels}
          className="bg-white border border-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Recalculating...' : 'Recalculate Models'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-indigo-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Crunching intelligence models...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                <h3 className="font-semibold text-slate-700">Analyzed Customers</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats.total.toLocaleString()}</div>
              {stats.total > 0 ? (
                <div className="text-sm text-emerald-600 font-medium mt-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Ready for action
                </div>
              ) : (
                <div className="text-sm text-slate-500 font-medium mt-2 flex items-center gap-1">
                  No data synced
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 p-2 rounded-lg"><Zap className="w-5 h-5 text-emerald-600" /></div>
                <h3 className="font-semibold text-slate-700">Predicted Revenue Lift</h3>
              </div>
              <div className="text-3xl font-bold text-slate-900">₹{stats.lift.toLocaleString()}</div>
              {stats.total > 0 ? (
                <div className="text-sm text-emerald-600 font-medium mt-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> If all actions applied
                </div>
              ) : (
                <div className="text-sm text-slate-500 font-medium mt-2 flex items-center gap-1">
                  No data synced
                </div>
              )}
            </div>

            <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg border border-indigo-500 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Zap className="w-32 h-32" />
              </div>
              <h3 className="font-semibold text-indigo-100 relative z-10">Top Priority</h3>
              <p className="text-lg font-medium text-indigo-100 mt-2 relative z-10 leading-snug">
                {stats.priority > 0 
                  ? <span className="font-bold text-white">{stats.priority} High-CLV customers are at severe risk of churn right now.</span>
                  : <span>0 High-CLV customers found. Sync data to generate insights.</span>
                }
              </p>

            </div>
          </div>

          {segmentData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">K-Means Customer Demographics</h3>
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="h-64 w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={segmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {segmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} Customers`, 'Size']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {segmentData.map((s) => {
                    const segmentDescriptions = {
                      'Champions': 'High spend, frequent, and recent.',
                      'At Risk': 'High spend traditionally, but haven\'t bought recently.',
                      'New Customers': 'Recent buyers with low frequency.',
                      'Hibernating': 'Lowest spend, infrequent, and dormant.',
                      'Regulars': 'Moderate spend, recency, and frequency.'
                    };
                    return (
                      <div key={s.name} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="w-4 h-4 rounded-full shadow-sm flex-shrink-0 mt-1" style={{ backgroundColor: s.color }}></div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{s.name}</p>
                          <p className="text-xs font-medium text-slate-500 mb-1">{s.value} Customers</p>
                          <p className="text-[10px] leading-tight text-slate-400">{segmentDescriptions[s.name]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {rawCustomerData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-fuchsia-100 p-2 rounded-lg"><Zap className="w-5 h-5 text-fuchsia-600" /></div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  RFM Clustering (3D Interactive)
                </h3>
              </div>
              <p className="text-slate-500 mb-6 text-sm pl-12">Rotate the graph in 3D to visualize how the AI partitioned your distinct customer profiles.</p>
              
              <div className="w-full rounded-xl overflow-hidden shadow-inner border border-slate-100 bg-slate-50/50 flex justify-center items-center">
                {render3DScatter()}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}

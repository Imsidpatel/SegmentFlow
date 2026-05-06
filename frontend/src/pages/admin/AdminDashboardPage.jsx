import React, { useEffect, useState } from 'react';
import { Users, Building, Activity, Trash2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total_analysts: 0, total_clients: 0, total_insights_generated: 0, analysts_list: [], clients_list: [], customers_breakdown: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const logsRes = await fetch(import.meta.env.VITE_API_URL + '/api/admin/logs', { headers });
      if (!logsRes.ok) throw new Error('You do not have administrative privileges to view this dashboard.');
      
      const logsData = await logsRes.json();
      setLogs(logsData);

      const statsRes = await fetch(import.meta.env.VITE_API_URL + '/api/admin/stats', { headers });
      if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${type}? This action cannot be undone.`)) return;
    
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/${type}s/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchAdminData();
      } else {
        alert(`Failed to delete ${type}.`);
      }
    } catch (error) {
      console.error(error);
      alert(`Error deleting ${type}.`);
    }
  };

  if (loading) return <div className="p-8 text-white min-h-screen bg-gray-900">Loading admin data...</div>;
  if (error) return (
    <div className="p-8 min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-6 rounded-lg max-w-md text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p>{error}</p>
            <a href="/app" className="block mt-4 text-white underline">Return to Dashboard</a>
        </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Super Admin Portal</h1>
            <button onClick={() => { sessionStorage.removeItem('token'); sessionStorage.removeItem('isAdmin'); window.location.href = '/auth'; }} className="px-5 py-2 bg-rose-50 text-rose-600 border border-rose-100 text-sm font-bold rounded-lg hover:bg-rose-100 transition-colors">Sign out</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                <div className="p-4 bg-indigo-50 rounded-xl"><Building className="w-6 h-6 text-indigo-600"/></div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Total Client Workspaces</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total_clients}</p>
                </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                <div className="p-4 bg-emerald-50 rounded-xl"><Users className="w-6 h-6 text-emerald-600"/></div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Total User Analysts</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total_analysts}</p>
                </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                <div className="p-4 bg-purple-50 rounded-xl"><Activity className="w-6 h-6 text-purple-600"/></div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Customers Analyzed Globally</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total_insights_generated}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2"><Building className="w-4 h-4 text-indigo-500" /> Client Workspaces Directory</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {stats.clients_list?.length === 0 ? <p className="text-sm text-slate-500">No workspaces.</p> : stats.clients_list?.map((client, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-800">{client.name}</span>
                                <span className="text-xs text-slate-500">{client.industry}</span>
                            </div>
                            <button onClick={() => handleDelete('workspace', client.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete Workspace">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> Active Platform Analysts</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {stats.analysts_list?.length === 0 ? <p className="text-sm text-slate-500">No analysts.</p> : stats.analysts_list?.map((analyst, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-800 truncate" title={analyst.email}>{analyst.email}</span>
                                <span className="text-xs text-slate-500 truncate">WS: {analyst.workspace}</span>
                            </div>
                            <button onClick={() => handleDelete('analyst', analyst.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete Analyst">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" /> Global Data Distribution</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {stats.customers_breakdown?.length === 0 ? <p className="text-sm text-slate-500">No insights.</p> : stats.customers_breakdown?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                            <span className="text-sm font-semibold text-slate-800 truncate">{item.workspace}</span>
                            <span className="text-xs font-bold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full">{item.count} rows</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        <h2 className="text-xl font-bold text-slate-900 mb-4">Live Activity Audits</h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No activity logged yet across the system.</td>
                </tr>
                ) : (
                logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {log.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {log.action}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {log.details || '-'}
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

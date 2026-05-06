import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileType, CheckCircle, Loader2, ArrowRight, Trash2, Database, Plug, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DataUploadPage() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'connect'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  // Database Connection State
  const [connections, setConnections] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [dbForm, setDbForm] = useState({
    name: '', db_type: 'postgres', host: 'localhost', port: 5432, username: '', password: '', database_name: ''
  });

  const loadConnections = async () => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/data-sources', {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      if (res.ok) {
        setConnections(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'connect') loadConnections();
  }, [activeTab]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all uploaded customers and transactions from your workspace?")) return;
    setIsClearing(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/clear-data/', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      if (response.ok) {
        alert("Workspace data cleared successfully!");
        setFile(null);
      } else throw new Error("Failed to clear data");
    } catch (err) { alert(err.message); } 
    finally { setIsClearing(false); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/upload-data/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: formData,
      });
      if (response.status === 401) {
        sessionStorage.removeItem('token');
        return navigate('/auth');
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Upload failed');
      }
      setIsUploading(false); setUploadSuccess(true);
      setTimeout(() => navigate('/app/nba'), 1500);
    } catch (error) {
      console.error(error); setIsUploading(false);
      alert(error.message || 'Error uploading file.');
    }
  };

  const handleSaveConnection = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/data-sources', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...dbForm, port: parseInt(dbForm.port)
        })
      });
      if (res.ok) {
        alert("Connection Saved!");
        loadConnections();
        setDbForm({ name: '', db_type: 'postgres', host: 'localhost', port: 5432, username: '', password: '', database_name: '' });
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save');
      }
    } catch(err) { alert(err.message); }
  };

  const handleTestConnection = async (id) => {
    setIsTesting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data-sources/${id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      if (res.ok) alert("Connection Successful!");
      else {
        const err = await res.json();
        alert(`Connection failed: ${err.detail}`);
      }
    } catch(err) { alert("Error testing connection"); }
    finally { setIsTesting(false); }
  };

  const handleImportData = async (id, type) => {
    let payload = {};
    if (type === 'table') {
      const tableName = prompt("Enter the exact name of your database table to import completely (e.g. 'transactions'):");
      if (!tableName) return;
      payload = { table_name: tableName };
    } else {
      const query = prompt("Enter the SQL query to fetch raw transaction data:", "SELECT customer_id, amount, date FROM transactions");
      if (!query) return;
      payload = { query: query };
    }

    setIsUploading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data-sources/${id}/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsUploading(false); setUploadSuccess(true);
        setTimeout(() => navigate('/app/nba'), 1500);
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Import failed");
      }
    } catch(err) { 
        setIsUploading(false); alert(err.message); 
    }
  };

  const handleDeleteConnection = async (id) => {
    if (!window.confirm("Are you sure you want to completely disconnect and remove this database?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/data-sources/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      if (res.ok) {
        setConnections(connections.filter(c => c.id !== id));
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to delete connection.");
      }
    } catch(err) {
      alert("Error deleting connection");
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-12"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Data Integration</h2>
          <p className="text-slate-500 mt-2">Connect your data to SegmentFlow's ML intelligence engine.</p>
        </div>

        <div className="flex justify-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <button onClick={() => setActiveTab('upload')} className={`px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab==='upload' ? 'bg-indigo-600 shadow-md shadow-indigo-200 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            <UploadCloud className="w-5 h-5"/> File Upload
          </button>
          <button onClick={() => setActiveTab('connect')} className={`px-6 py-2.5 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab==='connect' ? 'bg-indigo-600 shadow-md shadow-indigo-200 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
            <Database className="w-5 h-5"/> Connect Database
          </button>
        </div>

        {uploadSuccess ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Analysis Complete!</h3>
            <p className="text-slate-500 mt-2">Navigating to your dashboard...</p>
          </motion.div>
        ) : activeTab === 'upload' ? (
          <div className="space-y-6 max-w-xl mx-auto">
            <label htmlFor="file-upload" className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
              <input id="file-upload" type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
              {file ? (
                <div className="flex flex-col items-center text-indigo-700">
                  <FileType className="w-12 h-12 mb-3 text-indigo-500" />
                  <span className="font-semibold">{file.name}</span>
                  <span className="text-sm text-indigo-500/80 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <UploadCloud className="w-12 h-12 mb-3 text-slate-400" />
                  <span className="font-medium text-slate-700">Click to upload CSV/Excel</span>
                  <span className="text-sm mt-1">CSV or Excel files only</span>
                </div>
              )}
            </label>
            <button onClick={handleUpload} disabled={!file || isUploading} className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${!file ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'}`}>
              {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Data & Training Model...</> : <>Process Dataset <ArrowRight className="w-5 h-5" /></>}
            </button>
            <div className="pt-4 flex justify-center mt-2">
              <button onClick={handleClearData} disabled={isClearing || isUploading} className="text-sm font-medium text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1.5">
                {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Clear Workspace Data
              </button>
            </div>
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Database className="text-indigo-600" /> Add Connection</h3>
                <form onSubmit={handleSaveConnection} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Connection Name</label>
                    <input required className="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={dbForm.name} onChange={e=>setDbForm({...dbForm, name: e.target.value})} placeholder="e.g. Master CRM DB" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Database Type</label>
                      <select className="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={dbForm.db_type} onChange={e=>setDbForm({...dbForm, db_type: e.target.value})}>
                        <option value="postgres">PostgreSQL</option><option value="mysql">MySQL</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Host</label>
                      <input required className="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={dbForm.host} onChange={e=>setDbForm({...dbForm, host: e.target.value})} placeholder="localhost or URL" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Port</label>
                      <input required type="number" className="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={dbForm.port} onChange={e=>setDbForm({...dbForm, port: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Database Name</label>
                      <input required className="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={dbForm.database_name} onChange={e=>setDbForm({...dbForm, database_name: e.target.value})} placeholder="postgres" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Username</label>
                      <input required className="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={dbForm.username} onChange={e=>setDbForm({...dbForm, username: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Password</label>
                      <input required type="password" className="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={dbForm.password} onChange={e=>setDbForm({...dbForm, password: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-slate-900 text-white font-medium rounded-lg mt-6 hover:bg-slate-800 transition-colors shadow-md">
                    Securely Save Connection
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Plug className="text-emerald-600" /> Saved Connections</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {connections.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-500 text-sm">
                      No database connections saved yet. Add one to the left to get started.
                    </div>
                  ) : null}
                  {connections.map(conn => (
                    <div key={conn.id} className="p-5 border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all bg-white group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-slate-800 text-lg">{conn.name}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider font-mono mt-1 px-2 py-0.5 bg-slate-100 rounded inline-block">{conn.db_type}</div>
                        </div>
                        <button disabled={isTesting || isUploading} onClick={() => handleDeleteConnection(conn.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Remove Connection">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-slate-600 mb-4 flex items-center gap-2">
                        <Database className="w-4 h-4 text-slate-400" /> {conn.host}:{conn.port}
                      </div>
                      <div className="flex gap-2">
                        <button disabled={isTesting || isUploading} onClick={() => handleTestConnection(conn.id)} className="flex-1 text-sm bg-slate-50 text-slate-700 font-medium hover:bg-slate-100 py-2 rounded-lg border border-slate-200 flex justify-center items-center gap-1.5 transition-colors">
                          <Plug className="w-4 h-4" /> Test
                        </button>
                        <button disabled={isTesting || isUploading} onClick={() => handleImportData(conn.id, 'table')} className="flex-1 text-sm bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 py-2 rounded-lg border border-indigo-100 flex justify-center items-center gap-1.5 transition-colors">
                          <Database className="w-4 h-4" /> Table
                        </button>
                        <button disabled={isTesting || isUploading} onClick={() => handleImportData(conn.id, 'query')} className="flex-1 text-sm bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 py-2 rounded-lg border border-emerald-100 flex justify-center items-center gap-1.5 transition-colors">
                          <Play className="w-4 h-4" /> Query
                        </button>
                      </div>
                      {isUploading && <div className="mt-3 text-xs text-indigo-600 text-center flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Fetching & Modeling Data...</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
        )}
      </motion.div>
    </div>
  );
}

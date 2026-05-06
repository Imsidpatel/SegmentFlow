import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Save, X, Search } from 'lucide-react';

export default function DataEditorPage() {
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingId, setEditingId] = useState(null);

  const fetchTransactions = () => {
    fetch(import.meta.env.VITE_API_URL + '/transactions/', {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(fetchedData => setData(Array.isArray(fetchedData) ? fetchedData : []))
      .catch(err => console.error("Error fetching transactions", err));
  };

  useEffect(() => {
    fetchTransactions();
  }, []);
  const [editForm, setEditForm] = useState({});

  const handleEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ ...row });
  };

  const handleSave = async () => {
    try {
      const method = editForm.isNew ? 'POST' : 'PUT';
      const url = editForm.isNew ? import.meta.env.VITE_API_URL + '/transactions/' : `${import.meta.env.VITE_API_URL}/transactions/${editForm.id}`;
      
      const payload = {
        id: editForm.id,
        customer_id: editForm.customer_id,
        amount: parseFloat(editForm.amount) || 0,
        date: editForm.date
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchTransactions();
        setEditingId(null);
      } else {
        alert("Failed to save transaction.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving transaction");
    }
  };

  const handleDelete = async (row) => {
    if (row.isNew) {
      setData(data.filter(item => item._tempKey !== row._tempKey));
      setEditingId(null);
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/transactions/${row.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        if (res.ok) {
          fetchTransactions();
        } else {
          alert("Failed to delete.");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAdd = () => {
    const tempKey = `TEMP-${Math.random()}`;
    const newRow = { id: '', _tempKey: tempKey, customer_id: '', amount: 0, date: new Date().toISOString().split('T')[0], isNew: true };
    setData([newRow, ...data]);
    handleEdit(newRow);
  };

  const filteredData = data.filter(row => {
    if (row.isNew) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      (row.customer_id && row.customer_id.toLowerCase().includes(searchLower)) ||
      (row.id && row.id.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Raw Data Editor</h2>
          <p className="text-sm text-slate-500">View and manually adjust your uploaded transaction dataset.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button 
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Row
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction ID</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer ID</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount (₹)</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredData.map((row) => (
              <tr key={row._tempKey || row.id} className="hover:bg-slate-50/80 transition-colors">
                {editingId === row.id ? (
                  <>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={editForm.id} 
                        onChange={(e) => setEditForm({...editForm, id: e.target.value})}
                        disabled={!editForm.isNew} 
                        placeholder="TRX-123..."
                        className={`w-full p-2 rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs ${!editForm.isNew ? 'bg-slate-100 border-transparent text-slate-500' : 'border-indigo-300'}`} 
                      />
                    </td>
                    <td className="p-3"><input type="text" value={editForm.customer_id} onChange={(e) => setEditForm({...editForm, customer_id: e.target.value})} className="w-full border border-indigo-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                    <td className="p-3"><input type="number" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})} className="w-full border border-indigo-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" /></td>
                    <td className="p-3"><input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="w-full border border-indigo-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={handleSave} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-4 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="p-4 font-medium text-slate-700">{row.customer_id}</td>
                    <td className="p-4 font-mono">₹{row.amount.toFixed(2)}</td>
                    <td className="p-4 text-slate-600">{row.date}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(row)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { BarChart3, LayoutDashboard, Database, Users, Settings, LogOut, UploadCloud, Activity } from 'lucide-react';

export default function DashboardLayout() {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + '/users/me', {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (err) {}
    };
    fetchProfile();
  }, []);

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const navItems = [
    { label: 'Data Upload', icon: UploadCloud, path: '/app/upload' },
    { label: 'Next Best Action', icon: LayoutDashboard, path: '/app/nba' },
    { label: 'Data Manager', icon: Database, path: '/app/data' },
    { label: 'Marketing Hub', icon: Users, path: '/app/customers' },
    { label: 'GA4 Analytics', icon: Activity, path: '/app/ga4' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">Segment<span className="text-indigo-600">Flow</span></span>
            </Link>
            
            {/* Main Navigation (Desktop) */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'text-indigo-600' 
                        : 'text-slate-600 hover:text-indigo-600'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Profile Avatar & Hover Tooltip */}
            <div className="flex items-center gap-4 relative group">
              <div className="h-9 w-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm border border-indigo-200 cursor-default shadow-sm transition-transform group-hover:scale-105">
                {userProfile ? getInitials(userProfile.name) : '...'}
              </div>
              
              {/* Hover Tooltip Dropdown */}
              <div className="absolute right-0 top-10 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top-right group-hover:translate-y-0 translate-y-2">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <p className="font-bold text-sm text-slate-800 truncate">{userProfile?.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{userProfile?.email}</p>
                </div>
                <div className="p-4 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Workspace</p>
                  <p className="text-sm font-medium text-slate-700 truncate flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    {userProfile?.company_name}
                  </p>
                </div>
                <div className="p-2">
                  <button 
                    onClick={() => {
                      sessionStorage.removeItem('token');
                      window.location.href = '/auth';
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left text-sm"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

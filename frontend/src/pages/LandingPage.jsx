import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Zap, ArrowRight, ShieldCheck, CheckCircle2, Settings, LogOut } from 'lucide-react';

export default function LandingPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(import.meta.env.VITE_API_URL + '/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchUser();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <Link to="/" className="font-bold text-xl text-slate-900 tracking-tight hover:opacity-80 transition-opacity">
                Segment<span className="text-indigo-600">Flow</span>
              </Link>
            </div>
            
            {/* Main Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/upload" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Data Upload</Link>
              <Link to="/app/nba" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Next Best Action</Link>
              <Link to="/app/data" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Data Manager</Link>
              <Link to="/app/customers" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Marketing Hub</Link>
              <Link to="/app/ga4" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">GA4 Analytics</Link>
            </div>

            {/* Auth Buttons or Profile */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="relative group">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-sm cursor-default border border-indigo-200">
                    {getInitials(user.name)}
                  </div>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right group-hover:translate-y-0 translate-y-2">
                    <div className="p-4 border-b border-slate-50">
                      <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-indigo-600 font-medium bg-indigo-50 inline-block px-2 py-0.5 rounded max-w-full truncate">{user.company_name}</p>
                        {user.industry && (
                          <div className="text-[11px] text-slate-500 flex flex-col gap-0.5 mt-2 ml-1">
                            <span><span className="font-semibold">Industry:</span> {user.industry}</span>
                            <span><span className="font-semibold">Size:</span> {user.company_size}</span>
                            <span><span className="font-semibold">Structure:</span> {user.business_structure}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link to="/onboarding" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
                        <Settings className="w-4 h-4" /> Edit Profile / Data
                      </Link>
                      <button 
                        onClick={() => {
                          sessionStorage.removeItem('token');
                          setUser(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Link to="/auth" state={{ mode: 'login' }} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">Log in</Link>
                  <Link to="/auth" state={{ mode: 'register' }} className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative pt-24 pb-32 overflow-hidden"
      >
        <div className="absolute inset-0 z-0 bg-slate-50">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Turn your customer data into <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Next Best Actions.</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed font-medium">
            Connect your live PostgreSQL/MySQL database or upload CSVs. Our AI automatically clusters your customers and tells you exactly what to do next to maximize LTV and prevent churn.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={user ? "/upload" : "/auth"} state={user ? null : { mode: 'register' }} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 flex items-center gap-2 w-full sm:w-auto justify-center">
              Start Analyzing Now <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

        </div>
      </motion.section>

      {/* Features Grid */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Understand your customers like never before</h2>
            <p className="mt-6 text-xl text-slate-600 leading-relaxed">
              SegmentFlow is the intelligence layer between your raw data and your marketing strategy. We process your complex transaction histories to tell you exactly who your best customers are, who is about to leave, and what message you should send them today.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                <Users className="w-7 h-7 text-blue-700" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Auto-Segmentation</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                Stop relying on basic demographics. We use advanced RFM (Recency, Frequency, Monetary) modeling combined with K-Means clustering to automatically group your customers based on their actual buying behavior inside your store.
              </p>
            </div>
            
            <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                <Zap className="w-7 h-7 text-emerald-700" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Predictive Insights</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                Look into the future. Our machine learning engine analyzes past purchase frequencies to predict each customer's Churn Probability and estimate their total Customer Lifetime Value over the next 12 months.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="bg-violet-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                <ShieldCheck className="w-7 h-7 text-violet-700" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Next Best Action</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                Data is useless without action. We translate complex ML clusters into plain-English "Nudges". Whether it's a win-back discount for at-risk users or an early-access invite for your champions, you'll know exactly what to do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight">How SegmentFlow Works</h2>
            <p className="mt-4 text-xl text-slate-400">From raw data to actionable marketing campaigns in three simple steps.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="relative">
              <div className="bg-indigo-600/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
                <span className="text-3xl font-black text-indigo-400">1</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Connect Your Data</h3>
              <p className="text-slate-400 text-lg">Connect directly to your live PostgreSQL or MySQL database, write SQL queries, or securely upload CSV extracts to our platform.</p>
            </div>
            <div className="relative">
              <div className="bg-indigo-600/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
                <span className="text-3xl font-black text-indigo-400">2</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">AI Processing</h3>
              <p className="text-slate-400 text-lg">Our universal ETL pipeline instantly cleans the data, runs RFM analysis, and trains a clustering model specific to your unique customer base.</p>
            </div>
            <div className="relative">
              <div className="bg-indigo-600/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
                <span className="text-3xl font-black text-indigo-400">3</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Execute Campaigns</h3>
              <p className="text-slate-400 text-lg">Use the Next Best Action dashboard to identify high-value opportunities and launch targeted email or SMS nudges directly to those segments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-900 tracking-tight">
                  Segment<span className="text-indigo-600">Flow</span>
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
                We are on a mission to democratize enterprise-grade analytics. SegmentFlow empowers marketing teams to turn raw data into predictable revenue using beautiful, automated machine learning pipelines.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link to="/upload" className="hover:text-indigo-600 transition-colors">Data Upload</Link></li>
                <li><Link to="/app/nba" className="hover:text-indigo-600 transition-colors">Segments</Link></li>
                <li><Link to="/app/customers" className="hover:text-indigo-600 transition-colors">Intelligence</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><span className="hover:text-indigo-600 transition-colors cursor-pointer">About Us</span></li>
                <li><Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-100 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">© 2026 SegmentFlow Analytics Inc. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-slate-400">
              <span className="hover:text-indigo-600 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-indigo-600 transition-colors cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

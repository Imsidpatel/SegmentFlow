import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      // In a real app, you would send this to your backend
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Link to="/" className="absolute top-8 left-8 flex items-center text-slate-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Home
      </Link>
      
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-indigo-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Get in Touch</h1>
        <p className="text-slate-500 text-center mb-8">
          Enter your email address below and we'll send you our contact information right away.
        </p>
        
        {submitted ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 transition-all">
            <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-medium">Thanks! We've sent our contact details to {email}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-sm"
            >
              Send Contact Info
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

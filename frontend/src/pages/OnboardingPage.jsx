import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Briefcase, Globe2, Target, ArrowRight, ArrowLeft } from 'lucide-react';

const industries = [
  "Retail & E-commerce",
  "SaaS & Technology",
  "Manufacturing",
  "Healthcare & Life Sciences",
  "Financial Services",
  "Real Estate",
  "Education",
  "Other"
];

const companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees"
];

const businessStructures = [
  "B2B (Business to Business)",
  "B2C (Business to Consumer)",
  "D2C (Direct to Consumer)",
  "Startup",
  "Enterprise",
  "Non-Profit"
];

const primaryObjectives = [
  "Improving customer retention",
  "Increasing Customer Lifetime Value (CLV)",
  "Churn reduction",
  "Identifying new market segments",
  "Predictive analytics for upselling",
  "Other"
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    industry: '',
    company_size: '',
    business_structure: '',
    location: '',
    primary_objective: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(import.meta.env.VITE_API_URL + '/company/onboarding', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save onboarding data');
      }
      
      // Success, navigate to upload page
      navigate('/upload');
    } catch (err) {
      console.error("Failed to save", err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tell us about your company
          </h2>
          <p className="mt-2 text-slate-600">
            We'll use this to tailor your insights and models.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200">
          
          <div className="mb-8">
            <div className="overflow-hidden bg-slate-200 rounded-full h-1.5">
              <motion.div 
                className="h-1.5 bg-indigo-600 rounded-full"
                initial={{ width: step === 1 ? '50%' : '100%' }}
                animate={{ width: step === 1 ? '50%' : '100%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-slate-500">
              <span className={step >= 1 ? 'text-indigo-600' : ''}>Firmographics</span>
              <span className={step >= 2 ? 'text-indigo-600' : ''}>Goals & Objectives</span>
            </div>
          </div>

          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry / Vertical</label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-slate-400" />
                      </div>
                      <select
                        name="industry"
                        required
                        value={formData.industry}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 border"
                      >
                        <option value="" disabled>Select your industry</option>
                        {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Size (Headcount)</label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <select
                        name="company_size"
                        required
                        value={formData.company_size}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 border"
                      >
                        <option value="" disabled>Select headcount</option>
                        {companySizes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Business Structure</label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase className="h-5 w-5 text-slate-400" />
                      </div>
                      <select
                        name="business_structure"
                        required
                        value={formData.business_structure}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 border"
                      >
                        <option value="" disabled>Select structure</option>
                        {businessStructures.map(bs => <option key={bs} value={bs}>{bs}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Geographic Location</label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe2 className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        name="location"
                        required
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. San Francisco, US & Europe"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 border"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Head office location, or regions where you operate.</p>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Objective</label>
                    <p className="mb-3 text-xs text-slate-500">What do you want to achieve with SegmentFlow?</p>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Target className="h-5 w-5 text-slate-400" />
                      </div>
                      <select
                        name="primary_objective"
                        required
                        value={formData.primary_objective}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 border"
                      >
                        <option value="" disabled>Select your primary goal</option>
                        {primaryObjectives.map(obj => <option key={obj} value={obj}>{obj}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-start gap-3 mt-6">
                    <Target className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-900 leading-relaxed">
                      We'll automatically configure your RFM analysis and Machine Learning models to optimize for <strong>{formData.primary_objective || 'your goal'}</strong>.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-4 flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 flex justify-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-[2] flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {step === 1 ? (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>{isSubmitting ? 'Saving...' : 'Complete Setup'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DataUploadPage from './pages/DataUploadPage';
import OnboardingPage from './pages/OnboardingPage';
import ContactPage from './pages/ContactPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// Dashboard
import DashboardLayout from './layouts/DashboardLayout';
import NextBestActionPage from './pages/dashboard/NextBestActionPage';
import DataEditorPage from './pages/dashboard/DataEditorPage';
import CustomerIntelligenceTable from './components/CustomerIntelligenceTable';
import GA4DashboardPage from './pages/dashboard/GA4DashboardPage';

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/contact" element={<ContactPage />} />
        
        {/* Onboarding */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        } />
        
        {/* Authenticated Dashboard */}
        <Route path="/app" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/app/nba" replace />} />
          <Route path="upload" element={<DataUploadPage />} />
          <Route path="nba" element={<NextBestActionPage />} />
          <Route path="data" element={<DataEditorPage />} />
          <Route path="customers" element={<CustomerIntelligenceTable />} />
          <Route path="ga4" element={<GA4DashboardPage />} />

        </Route>
        
        {/* Authenticated Admin Dashboard */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
        
        {/* Redirect old upload route */}
        <Route path="/upload" element={<Navigate to="/app/upload" replace />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

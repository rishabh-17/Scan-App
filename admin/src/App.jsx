import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import StaffDetail from './pages/StaffDetail';
import Users from './pages/Users';
import Payroll from './pages/Payroll';
import Projects from './pages/Projects';
import Centers from './pages/Centers';
import ApprovalDashboard from './pages/ApprovalDashboard';
import RateCharts from './pages/RateCharts';
import WorkUpload from './pages/WorkUpload';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute>
              <Layout>
                <Staff />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/staff/:id" element={
            <ProtectedRoute>
              <Layout>
                <StaffDetail />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <Layout>
                <Users />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/projects" element={
            <ProtectedRoute>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/centers" element={
            <ProtectedRoute>
              <Layout>
                <Centers />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/approvals" element={
            <ProtectedRoute>
              <Layout>
                <ApprovalDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/rates" element={
            <ProtectedRoute>
              <Layout>
                <RateCharts />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute>
              <Layout>
                <WorkUpload />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute>
              <Layout>
                <Payroll />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

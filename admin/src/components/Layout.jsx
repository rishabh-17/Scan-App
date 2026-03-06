import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import compactLogo from '../assets/compact_logo.png';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path
      ? 'bg-gray-800 text-white font-semibold'
      : 'text-gray-400 hover:bg-gray-800 hover:text-white';

  const getTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/staff') return 'Staff Management';
    if (location.pathname === '/users') return 'User Management';
    if (location.pathname === '/payroll') return 'Payroll';
    if (location.pathname === '/projects') return 'Projects';
    if (location.pathname === '/centers') return 'Centers';
    if (location.pathname === '/rates') return 'Rate Charts';
    if (location.pathname === '/approvals') return 'Approval Dashboard';
    return 'Admin Panel';
  };

  // Check roles helper
  const hasRole = (roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-800 flex justify-center items-center">
          <img src={compactLogo} alt="Scanner Logo" className="w-16 h-16 object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link
            to="/"
            className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/')}`}
          >
            Dashboard
          </Link>

          {hasRole(['center_supervisor']) && (
            <Link
              to="/upload"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/upload')}`}
            >
              Upload Work
            </Link>
          )}

          {hasRole(['center_supervisor']) && (
            <Link
              to="/staff"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/staff')}`}
            >
              Staff Management
            </Link>
          )}

          {hasRole([]) && ( // Admin only
            <Link
              to="/users"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/users')}`}
            >
              User Management
            </Link>
          )}

          {hasRole(['project_manager']) && (
            <Link
              to="/projects"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/projects')}`}
            >
              Projects
            </Link>
          )}

          {hasRole(['project_manager', 'finance_hr']) && (
            <Link
              to="/rates"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/rates')}`}
            >
              Rate Charts
            </Link>
          )}

          {hasRole([]) && ( // Admin and Finance
            <Link
              to="/centers"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/centers')}`}
            >
              Centers
            </Link>
          )}

          {hasRole(['finance_hr']) && (
            <Link
              to="/payroll"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/payroll')}`}
            >
              Payroll
            </Link>
          )}

          {hasRole(['project_manager', 'finance_hr']) && (
            <Link
              to="/approvals"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/approvals')}`}
            >
              Approval Dashboard
            </Link>
          )}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
            <div className="overflow-hidden">
              <p className="text-xs text-gray-400">Logged in as</p>
              <p className="text-sm font-semibold text-white truncate w-32">
                {user?.name}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{getTitle()}</h2>
          <div className="flex items-center space-x-4">
            {/* Add header actions here if needed */}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

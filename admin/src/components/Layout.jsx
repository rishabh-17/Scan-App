import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

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
      ? 'bg-indigo-50 text-indigo-600 font-semibold'
      : 'text-gray-600 hover:bg-gray-100';

  const getTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/staff') return 'Staff Management';
    if (location.pathname === '/users') return 'User Management';
    if (location.pathname === '/payroll') return 'Payroll';
    if (location.pathname === '/projects') return 'Projects';
    return 'Admin Panel';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Scanner Admin
          </h2>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link
            to="/"
            className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/')}`}
          >
            Dashboard
          </Link>

          {(user.role === 'admin' || user.role === 'center_manager') && (
            <Link
              to="/staff"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/staff')}`}
            >
              Staff Management
            </Link>
          )}

          {user.role === 'admin' && (
            <Link
              to="/users"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/users')}`}
            >
              User Management
            </Link>
          )}

          {(user.role === 'admin' || user.role === 'project_manager') && (
            <Link
              to="/projects"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/projects')}`}
            >
              Projects
            </Link>
          )}

          {(user.role === 'admin' || user.role === 'finance_manager') && (
            <Link
              to="/payroll"
              className={`flex items-center px-3 py-2 rounded-lg transition ${isActive('/payroll')}`}
            >
              Payroll
            </Link>
          )}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">{getTitle()}</h1>

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
          >
            Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
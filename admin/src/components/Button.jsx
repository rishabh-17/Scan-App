import React from 'react';
import Loader from './Loader';

const Button = ({ 
  children, 
  loading = false, 
  disabled = false, 
  variant = 'primary', 
  className = '', 
  onClick, 
  type = 'button',
  ...props 
}) => {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 focus:ring-indigo-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
  };

  const baseStyles = 'inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <Loader size="sm" className="mr-2" />
      )}
      {children}
    </button>
  );
};

export default Button;

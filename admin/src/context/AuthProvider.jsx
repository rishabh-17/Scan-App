import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data);
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const login = async (loginId, password) => {
    const { data } = await api.post('/auth/login', { loginId, password });
    localStorage.setItem('token', data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, themeMode, setThemeMode }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

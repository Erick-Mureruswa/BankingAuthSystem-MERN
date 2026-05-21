import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || 'banking_client';
const CLIENT_SECRET = process.env.REACT_APP_CLIENT_SECRET || 'banking_client_secret_2024';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) fetchMe().finally(() => setLoading(false));
    else setLoading(false);
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/oauth/token', {
      grant_type: 'password',
      username: email,
      password,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'accounts:read accounts:write transactions:read transactions:write',
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await fetchMe();
  };

  const register = async (name, email, password, phone) => {
    await api.post('/auth/register', { name, email, password, phone });
  };

  const logout = async () => {
    try {
      await api.post('/auth/revoke', { token: localStorage.getItem('access_token') });
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

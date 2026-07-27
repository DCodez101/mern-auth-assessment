import { createContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken, registerTokenRefreshHandler } from '../services/api.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [loading, setLoading] = useState(true); // true during initial silent-refresh check

  // Keep api.js's module-level token in sync with React state, and vice versa
  // when api.js refreshes the token behind the scenes on a 401.
  useEffect(() => {
    registerTokenRefreshHandler((token) => {
      setAccessTokenState(token);
      setAccessToken(token);
    });
  }, []);

  // On first load there is no access token in memory yet (a full page
  // refresh wipes React state). Try /auth/refresh once using the httpOnly
  // cookie to silently restore the session.
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        setAccessTokenState(data.accessToken);
        const meRes = await api.get('/users/me');
        setUser(meRes.data.user);
      } catch {
        setAccessToken(null);
        setAccessTokenState(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setAccessTokenState(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    setAccessToken(data.accessToken);
    setAccessTokenState(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
    }
  }, []);

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

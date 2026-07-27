import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

// Small convenience hook so components do useAuth() instead of
// useContext(AuthContext) + null-check everywhere.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

// Gate wrapping routes that require an authenticated user. While the
// silent-refresh bootstrap in AuthContext is still running, show a loading
// state instead of bouncing to /login prematurely.
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-text">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

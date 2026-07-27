import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="spark" />
        EMBER AUTH
      </Link>
      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <span className="navbar-tag">{user?.email}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-tag">Login</Link>
            <Link to="/signup" className="navbar-tag">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

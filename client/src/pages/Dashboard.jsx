import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="card card-wide">
      <span className="card-eyebrow">Protected</span>
      <h1 className="card-title">Dashboard</h1>
      <p className="card-subtitle">
        Only visible with a valid access token. Data below came from
        <code> GET /api/users/me</code>.
      </p>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-box-label">Name</div>
          <div className="stat-box-value">{user?.name}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Email</div>
          <div className="stat-box-value">{user?.email}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">User ID</div>
          <div className="stat-box-value">{user?.id}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Joined</div>
          <div className="stat-box-value">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
          </div>
        </div>
      </div>

      <button className="btn btn-danger" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Dashboard;

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from '../components/AdminDashboard';
import Navbar from '../components/Navbar';

const Admin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token    = localStorage.getItem('vb_admin_token');
    const adminUser = JSON.parse(localStorage.getItem('vb_admin_user') || '{}');
    if (!token || !['staff','super_admin'].includes(adminUser.role)) {
      navigate('/admin/login');
    }
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar isAdmin />
      <AdminDashboard />
    </div>
  );
};

export default Admin;

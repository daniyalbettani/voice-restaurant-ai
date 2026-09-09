import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AdminLogin = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try { data = await res.json(); }
      catch { setError('Server returned an unexpected response.'); setLoading(false); return; }

      if (!res.ok) { setError(data?.message || 'Login failed.'); setLoading(false); return; }

      const role = data?.user?.role;
      if (!role || (role !== 'staff' && role !== 'super_admin')) {
        setError("⛔ Access denied. You don't have staff permissions. Contact the restaurant owner.");
        setLoading(false); return;
      }

      localStorage.setItem('vb_admin_token', data.token);
      // Store only essential fields — avatarUrl is base64 and exceeds localStorage quota
      const adminData = { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role };
      localStorage.setItem('vb_admin_user', JSON.stringify(adminData));
      navigate('/admin');
    } catch (err) {
      console.error('Admin login error:', err);
      setError(`Connection error: ${err.message}. Make sure the server is running on port 5000.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo gradient-text">🍽️ VoiceBite</div>
        <p className="login-subtitle">Staff & Admin Portal — Restricted Access</p>

        <div style={{ background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.2)',borderRadius:'10px',padding:'12px 16px',marginBottom:'24px',fontSize:'13px',color:'var(--orange-light)',lineHeight:1.6 }}>
          🔒 Only authorised restaurant staff can access this panel. Contact the owner to get access.
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
            />
          </div>

          {error && <p className="form-error">⚠️ {error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width:'100%', justifyContent:'center', marginTop:'24px' }}
            disabled={loading}
          >
            {loading ? '⏳ Verifying…' : '🔐 Login to Dashboard'}
          </button>
        </form>

        <div style={{ marginTop:'24px', textAlign:'center' }}>
          <Link to="/" style={{ color:'var(--text3)', fontSize:'13px', textDecoration:'none' }}>
            ← Back to Restaurant
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

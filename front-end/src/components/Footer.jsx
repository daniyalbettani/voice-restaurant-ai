import { Link } from 'react-router-dom';

// Returns the active super_admin user from EITHER session
const isSuperAdmin = () => {
  try {
    // 1. Check admin portal session
    const adminRaw = localStorage.getItem('vb_admin_user');
    if (adminRaw && adminRaw !== 'null' && adminRaw !== 'undefined') {
      const adminUser = JSON.parse(adminRaw);
      if (adminUser?.role === 'super_admin') return true;
    }
    // 2. Check customer portal session (super_admin can also log in via main site)
    const userRaw = localStorage.getItem('vb_user');
    if (userRaw && userRaw !== 'null' && userRaw !== 'undefined') {
      const user = JSON.parse(userRaw);
      if (user?.role === 'super_admin') return true;
    }
    return false;
  } catch { return false; }
};

const Footer = () => {
  const showDashboard = isSuperAdmin();

  return (
    <footer className="footer">
      <div className="footer-logo gradient-text">🍽️ VoiceBite AI</div>
      <p className="footer-text">
        The future of restaurant ordering — just speak and we handle the rest.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {/* Navigation */}
        <div>
          <div style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Navigation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[['Home', '#hero'], ['Menu', '#menu'], ['How It Works', '#how-it-works'], ['Reviews', '#testimonials']].map(([label, id]) => (
              <a key={label} href={id} style={{ color: 'var(--text3)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--orange-light)'}
                onMouseLeave={e => e.target.style.color = 'var(--text3)'}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Portal */}
        <div>
          <div style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Portal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/admin/login"
              style={{ color: 'var(--text3)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--orange-light)'}
              onMouseLeave={e => e.target.style.color = 'var(--text3)'}>
              🔐 Admin Login
            </Link>
            {/* Dashboard — visible ONLY to super_admin */}
            {showDashboard && (
              <Link to="/admin"
                style={{ color: 'var(--orange-light)', fontSize: '14px', textDecoration: 'none', fontWeight: 700, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fbbf24'}
                onMouseLeave={e => e.target.style.color = 'var(--orange-light)'}>
                👑 Super Admin Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <div style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Tech Stack</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['React 19 + Vite', 'Node.js + Express', 'MongoDB Atlas', 'Socket.io', 'Web Speech API'].map(t => (
              <span key={t} style={{ color: 'var(--text3)', fontSize: '13px' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} VoiceBite AI — Final Year Project &nbsp;·&nbsp; Built with ❤️
      </div>
    </footer>
  );
};

export default Footer;

import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-logo gradient-text">🍽️ VoiceBite AI</div>
      <p className="footer-text">
        The future of restaurant ordering — just speak and we handle the rest.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '32px' }}>
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

        <div>
          <div style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Portal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/admin/login" style={{ color: 'var(--text3)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--orange-light)'}
              onMouseLeave={e => e.target.style.color = 'var(--text3)'}>
              🔐 Admin Panel
            </Link>
            <Link to="/admin" style={{ color: 'var(--text3)', fontSize: '14px', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--orange-light)'}
              onMouseLeave={e => e.target.style.color = 'var(--text3)'}>
              📊 Dashboard
            </Link>
          </div>
        </div>

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

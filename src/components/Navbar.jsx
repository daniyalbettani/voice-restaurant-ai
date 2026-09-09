import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';
import CartDrawer from './CartDrawer';

const Navbar = ({ isAdmin = false }) => {
  const [authOpen,    setAuthOpen]    = useState(false);
  const [authTab,     setAuthTab]     = useState('login');
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const { user, isLoggedIn, logout } = useAuth();
  const { cartCount, setCartOpen }   = useCart();
  const { theme, toggleTheme }       = useTheme();
  const navigate = useNavigate();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('voicebite_admin');
    navigate('/');
  };

  const getInitial = (name) => name ? name[0].toUpperCase() : '?';

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMobileOpen(false)}>
          🍽️ <span className="logo-text">VoiceBite AI</span>
        </Link>

        {/* Desktop links */}
        {!isAdmin && (
          <div className="navbar-links">
            <button className="navbar-link" onClick={() => scrollTo('hero')}>Home</button>
            <button className="navbar-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
            <button className="navbar-link" onClick={() => scrollTo('menu')}>Menu</button>
            <button className="navbar-link" onClick={() => scrollTo('voice')}>Order</button>
            <button className="navbar-link" onClick={() => scrollTo('testimonials')}>Reviews</button>
          </div>
        )}
        {isAdmin && <span className="navbar-link" style={{ color:'var(--text)' }}>Admin Dashboard</span>}

        {/* Right side actions */}
        <div className="navbar-actions">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {!isAdmin && (
            <>
              {/* Cart icon */}
              <button className="cart-btn" onClick={() => setCartOpen(true)} title="View Cart">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>

              {/* Auth buttons */}
              {isLoggedIn ? (
                <button
                  className="avatar-btn"
                  onClick={() => setProfileOpen(true)}
                  title="My Profile"
                >
                  <div className="avatar-circle">
                    {user.avatarUrl ? (
                      user.avatarUrl.startsWith('data:') ? (
                        <img src={user.avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      ) : (
                        <span style={{ fontSize:'17px', lineHeight:1 }}>{user.avatarUrl}</span>
                      )
                    ) : (
                      <span style={{ fontWeight:800, fontSize:'14px', color:'#fff' }}>{getInitial(user.name)}</span>
                    )}
                  </div>
                  <span className="avatar-name">{user.name.split(' ')[0]}</span>
                </button>
              ) : (
                <div className="auth-btns">
                  <button onClick={() => { setAuthTab('login'); setAuthOpen(true); }} className="btn btn-ghost nav-btn">Sign In</button>
                  <button onClick={() => { setAuthTab('register'); setAuthOpen(true); }} className="btn btn-primary nav-btn">Get Started</button>
                </div>
              )}
            </>
          )}

          {isAdmin && (
            <div style={{ display:'flex', gap:'8px' }}>
              <Link to="/" className="btn btn-ghost nav-btn">← Home</Link>
              <button onClick={handleAdminLogout} className="btn btn-ghost nav-btn">Logout</button>
            </div>
          )}

          {/* Hamburger */}
          {!isAdmin && (
            <button className="hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
              <span className={`ham-line ${mobileOpen ? 'open' : ''}`} />
              <span className={`ham-line ${mobileOpen ? 'open' : ''}`} />
              <span className={`ham-line ${mobileOpen ? 'open' : ''}`} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          {['hero','how-it-works','menu','voice','testimonials'].map((id, i) => (
            <button key={id} className="mobile-link" onClick={() => scrollTo(id)}>
              {['🏠 Home','⚙️ How It Works','📋 Menu','🎤 Order','⭐ Reviews'][i]}
            </button>
          ))}
          {!isLoggedIn && (
            <>
              <button className="mobile-link" onClick={() => { setAuthTab('login'); setAuthOpen(true); setMobileOpen(false); }}>🔐 Sign In</button>
              <button className="mobile-link" style={{ color:'var(--orange-light)' }} onClick={() => { setAuthTab('register'); setAuthOpen(true); setMobileOpen(false); }}>✨ Create Account</button>
            </>
          )}
          {isLoggedIn && (
            <button className="mobile-link" onClick={() => { setProfileOpen(true); setMobileOpen(false); }}>👤 My Profile</button>
          )}
        </div>
      )}

      {/* Modals */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
      <UserProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <CartDrawer />
    </>
  );
};

export default Navbar;

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const [tab, setTab] = useState(defaultTab);
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass]   = useState('');

  // Register fields
  const [regName,  setRegName]  = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass,  setRegPass]  = useState('');
  const [regPhone, setRegPhone] = useState('');

  // OTP field
  const [otp, setOtp] = useState('');

  const { login, register } = useAuth();

  useEffect(() => { setTab(defaultTab); setStep('form'); setError(''); }, [defaultTab, isOpen]);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (!isOpen) return null;

  const switchTab = (t) => { setTab(t); setStep('form'); setError(''); setOtp(''); };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(loginEmail, loginPass);
      setStep('success');
      setTimeout(onClose, 1500);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── REGISTER STEP 1: Send OTP ─────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (regPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPass, phone: regPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep('otp');
      setCountdown(60);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── REGISTER STEP 2: Verify OTP ───────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // Auto-login after registration
      localStorage.setItem('vb_token', data.token);
      localStorage.setItem('vb_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('vb_auth_change'));
      setStep('success');
      setTimeout(onClose, 1500);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    try {
      await fetch(`${API}/api/auth/resend-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail }),
      });
      setCountdown(60);
      setError('');
    } catch { setError('Failed to resend OTP.'); }
  };

  const inputStyle = {
    width: '100%', padding: '13px 18px',
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: '12px', color: 'var(--text)', fontSize: '15px',
    fontFamily: 'Inter, sans-serif', outline: 'none', transition: 'all 0.2s',
    boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text2)' };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: '100%', maxWidth: '460px', background: 'var(--bg3)',
        borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.35s cubic-bezier(0.4,0,0.2,1)', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '22px', fontWeight: 900 }} className="gradient-text">🍽️ VoiceBite</span>
            <button onClick={onClose} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: '14px' }}>✕ Close</button>
          </div>
          <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: '10px', padding: '4px', gap: '4px' }}>
            {['login','register'].map(t => (
              <button key={t} onClick={() => switchTab(t)} style={{
                flex: 1, padding: '9px', border: 'none', borderRadius: '7px', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px',
                background: tab === t ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text2)', transition: 'all 0.2s',
              }}>
                {t === 'login' ? '🔐 Sign In' : '✨ Create Account'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          {step === 'success' ? (
            <div style={{ textAlign: 'center', paddingTop: '60px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                {tab === 'login' ? 'Welcome back!' : 'Account created!'}
              </h3>
              <p style={{ color: 'var(--green)', fontSize: '16px' }}>You're now signed in. Enjoy VoiceBite!</p>
            </div>

          ) : step === 'otp' ? (
            /* OTP VERIFICATION SCREEN */
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Check Your Email</h2>
                <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.6 }}>
                  We sent a 6-digit OTP to<br />
                  <strong style={{ color: 'var(--orange-light)' }}>{regEmail}</strong>
                </p>
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'12px 16px', color:'var(--red)', fontSize:'14px', marginBottom:'20px' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Enter OTP Code</label>
                  <input
                    type="text" maxLength={6} placeholder="_ _ _ _ _ _"
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required autoFocus
                    style={{ ...inputStyle, textAlign: 'center', fontSize: '28px', fontWeight: 800, letterSpacing: '10px', padding: '16px' }}
                    onFocus={e => e.target.style.borderColor='var(--orange)'}
                    onBlur={e => e.target.style.borderColor='var(--border)'}
                  />
                </div>

                <button type="submit" disabled={loading || otp.length !== 6}
                  style={{ width:'100%', padding:'14px', fontSize:'16px', fontWeight:700, border:'none', borderRadius:'12px', background: otp.length===6 ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'var(--card)', color: otp.length===6 ? '#fff' : 'var(--text3)', cursor: otp.length===6 ? 'pointer' : 'not-allowed', fontFamily:'Inter,sans-serif', transition:'all 0.2s' }}>
                  {loading ? '⏳ Verifying…' : '✅ Verify & Create Account'}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button type="button" onClick={handleResendOtp} disabled={countdown > 0}
                    style={{ background:'none', border:'none', color: countdown > 0 ? 'var(--text3)' : 'var(--orange-light)', cursor: countdown > 0 ? 'default' : 'pointer', fontSize:'14px', fontFamily:'Inter,sans-serif', fontWeight:600 }}>
                    {countdown > 0 ? `Resend OTP in ${countdown}s` : '📨 Resend OTP'}
                  </button>
                </div>

                <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                  style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'13px', fontFamily:'Inter,sans-serif', textAlign:'center' }}>
                  ← Back to registration
                </button>
              </form>
            </>

          ) : tab === 'login' ? (
            /* LOGIN FORM */
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>Welcome Back</h2>
              <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'28px' }}>Sign in to track orders & enjoy personalized service</p>

              {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'12px 16px', color:'var(--red)', fontSize:'14px', marginBottom:'20px' }}>⚠️ {error}</div>}

              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required autoFocus
                    style={inputStyle} onFocus={e => e.target.style.borderColor='var(--orange)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position:'relative' }}>
                    <input type={showPass ? 'text' : 'password'} placeholder="Your password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required
                      style={{ ...inputStyle, paddingRight:'50px' }} onFocus={e => e.target.style.borderColor='var(--orange)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px' }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding:'14px', fontSize:'16px', fontWeight:700, border:'none', borderRadius:'12px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif', opacity: loading ? 0.7 : 1 }}>
                  {loading ? '⏳ Signing in…' : '🔐 Sign In'}
                </button>
                <p style={{ textAlign:'center', color:'var(--text2)', fontSize:'14px' }}>
                  No account?{' '}
                  <button type="button" onClick={() => switchTab('register')}
                    style={{ background:'none', border:'none', color:'var(--orange-light)', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'14px' }}>
                    Create one →
                  </button>
                </p>
              </form>
            </>

          ) : (
            /* REGISTER FORM */
            <>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>Join VoiceBite</h2>
              <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'28px' }}>Create your account — an OTP will be sent to verify your email</p>

              {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'12px 16px', color:'var(--red)', fontSize:'14px', marginBottom:'20px' }}>⚠️ {error}</div>}

              <form onSubmit={handleSendOtp} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input type="text" placeholder="John Doe" value={regName} onChange={e => setRegName(e.target.value)} required autoFocus
                    style={inputStyle} onFocus={e => e.target.style.borderColor='var(--orange)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required
                    style={inputStyle} onFocus={e => e.target.style.borderColor='var(--orange)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                </div>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input type="tel" placeholder="+92 300 1234567" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                    style={inputStyle} onFocus={e => e.target.style.borderColor='var(--orange)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position:'relative' }}>
                    <input type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={regPass} onChange={e => setRegPass(e.target.value)} required
                      style={{ ...inputStyle, paddingRight:'50px' }} onFocus={e => e.target.style.borderColor='var(--orange)'} onBlur={e => e.target.style.borderColor='var(--border)'} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px' }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding:'14px', fontSize:'16px', fontWeight:700, border:'none', borderRadius:'12px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:'4px', opacity: loading ? 0.7 : 1 }}>
                  {loading ? '⏳ Sending OTP…' : '📧 Send OTP to Email'}
                </button>
                <p style={{ textAlign:'center', color:'var(--text2)', fontSize:'14px' }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchTab('login')}
                    style={{ background:'none', border:'none', color:'var(--orange-light)', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'14px' }}>
                    Sign in →
                  </button>
                </p>
              </form>
            </>
          )}
        </div>

        <div style={{ padding:'16px 32px', borderTop:'1px solid var(--border)', color:'var(--text3)', fontSize:'12px', textAlign:'center' }}>
          🔒 Your data is encrypted with bcrypt — VoiceBite AI
        </div>
      </div>
    </>
  );
};

export default AuthModal;

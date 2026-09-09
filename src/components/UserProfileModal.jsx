import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const PRESET_AVATARS = [
  '👨‍🍳','👩‍🍳','🧑‍🍳','🦊','🐯','🤖','👑','🎤',
  '🍔','🌮','🍕','🍜','☕','🌟','⚡','🎮',
  '🏆','🦁','🐺','🎭','🦸','🦹','🧙','🧚',
  '🌈','🔥','💫','🎯','🎲','🚀','💎','🌺',
];

const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, token, logout } = useAuth();
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [avatar,     setAvatar]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [msg,        setMsg]        = useState({ text: '', type: '' });
  const [nameMsg,    setNameMsg]    = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatarUrl || '');
      setShowPicker(false);
      setNameMsg('');
      setMsg({ text: '', type: '' });
    }
  }, [user, isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen || !user) return null;

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3500);
  };

  const syncUser = (data) => {
    localStorage.setItem('vb_user', JSON.stringify(data.user));
    localStorage.setItem('vb_token', data.token);
    window.dispatchEvent(new Event('vb_auth_change'));
  };

  const callProfile = async (body) => {
    const res = await fetch(`${API}/api/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  };

  // Upload photo from file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { flash('Image must be under 3MB', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
    setShowPicker(false);
  };

  // Save avatar (photo or emoji)
  const handleSaveAvatar = async () => {
    setLoading(true);
    try {
      const data = await callProfile({ avatarUrl: avatar });
      syncUser(data);
      flash('Profile picture updated! ✅');
      setShowPicker(false);
    } catch (err) { flash(err.message, 'error'); }
    finally { setLoading(false); }
  };

  // Delete avatar
  const handleDeleteAvatar = async () => {
    setLoading(true);
    try {
      const data = await callProfile({ avatarUrl: '' });
      syncUser(data);
      setAvatar('');
      flash('Profile picture removed ✅');
    } catch (err) { flash(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === user.name) return;
    setLoading(true); setNameMsg('');
    try {
      const data = await callProfile({ name });
      syncUser(data);
      flash('Name updated! ✅');
    } catch (err) { setNameMsg(err.message); }
    finally { setLoading(false); }
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || email.trim() === user.email) return;
    setLoading(true);
    try {
      const data = await callProfile({ email });
      syncUser(data);
      flash('Email updated! ✅');
    } catch (err) { flash(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('⚠️ Permanently delete your account and all data?')) return;
    if (!window.confirm('Last chance — this cannot be undone!')) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/auth/account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      logout(); onClose();
    } catch { flash('Failed to delete account.', 'error'); }
    finally { setLoading(false); }
  };

  const isPhotoChanged = avatar !== (user.avatarUrl || '');
  const daysLeft = user.nameChangedAt
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(user.nameChangedAt)) / 86400000))
    : 0;

  // Render avatar preview (big circle)
  const renderAvatarPreview = () => {
    if (avatar) {
      if (avatar.startsWith('data:')) {
        return <img src={avatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />;
      }
      return <span style={{ fontSize:'44px', lineHeight:1 }}>{avatar}</span>;
    }
    return <span style={{ fontSize:'36px', fontWeight:900, color:'#fff' }}>{user.name?.[0]?.toUpperCase() || '?'}</span>;
  };

  const inp = {
    width:'100%', padding:'11px 14px', background:'var(--bg2)',
    border:'1px solid var(--border)', borderRadius:'10px', color:'var(--text)',
    fontSize:'14px', fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box',
    transition:'border-color 0.2s',
  };
  const btnOrange = {
    padding:'9px 18px', background:'linear-gradient(135deg,#f97316,#ea580c)',
    border:'none', borderRadius:'9px', color:'#fff',
    fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'13px',
    cursor:'pointer', opacity: loading ? 0.7 : 1, whiteSpace:'nowrap',
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(6px)' }} />
      <div style={{
        position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:'100%',maxWidth:'430px',
        background:'var(--bg3)',borderLeft:'1px solid var(--border)',
        display:'flex',flexDirection:'column',animation:'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflowY:'auto',
      }}>
        {/* Header */}
        <div style={{ padding:'22px 26px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
          <h2 style={{ fontWeight:800,fontSize:'19px' }}>👤 My Profile</h2>
          <button onClick={onClose} style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'6px 12px',color:'var(--text2)',cursor:'pointer',fontSize:'13px',fontFamily:'Inter,sans-serif' }}>✕</button>
        </div>

        {/* Avatar section */}
        <div style={{ padding:'24px 26px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex',gap:'18px',alignItems:'flex-start' }}>
            {/* Big avatar */}
            <div style={{ width:'82px',height:'82px',borderRadius:'50%',overflow:'hidden',flexShrink:0,background:'linear-gradient(135deg,#f97316,#ea580c)',display:'flex',alignItems:'center',justifyContent:'center',border:'3px solid var(--orange)' }}>
              {renderAvatarPreview()}
            </div>

            {/* Controls */}
            <div style={{ flex:1,display:'flex',flexDirection:'column',gap:'8px' }}>
              <p style={{ fontWeight:700,fontSize:'15px',marginBottom:'2px' }}>{user.name}</p>
              <p style={{ color:'var(--text2)',fontSize:'12px' }}>{user.email}</p>
              <div style={{ display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'4px' }}>
                <button onClick={() => fileRef.current?.click()} style={{ padding:'6px 12px',fontSize:'12px',fontWeight:700,fontFamily:'Inter,sans-serif',background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',color:'var(--text2)',cursor:'pointer' }}>
                  📷 Upload
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileUpload} />
                <button onClick={() => setShowPicker(p => !p)} style={{ padding:'6px 12px',fontSize:'12px',fontWeight:700,fontFamily:'Inter,sans-serif',background: showPicker ? 'rgba(249,115,22,0.12)' : 'var(--card)',border: showPicker ? '1px solid var(--orange)' : '1px solid var(--border)',borderRadius:'8px',color: showPicker ? 'var(--orange-light)' : 'var(--text2)',cursor:'pointer' }}>
                  😎 Avatars
                </button>
                {user.avatarUrl && (
                  <button onClick={handleDeleteAvatar} disabled={loading} style={{ padding:'6px 12px',fontSize:'12px',fontWeight:700,fontFamily:'Inter,sans-serif',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',color:'var(--red)',cursor:'pointer' }}>
                    🗑️ Remove
                  </button>
                )}
              </div>
              {isPhotoChanged && (
                <button onClick={handleSaveAvatar} disabled={loading} style={{ ...btnOrange, fontSize:'12px', padding:'7px 14px', alignSelf:'flex-start' }}>
                  {loading ? '⏳ Saving…' : '💾 Save Photo'}
                </button>
              )}
            </div>
          </div>

          {/* Emoji picker */}
          {showPicker && (
            <div style={{ marginTop:'16px',padding:'14px',background:'var(--bg2)',borderRadius:'12px',border:'1px solid var(--border)',overflow:'hidden' }}>
              <p style={{ fontSize:'12px',fontWeight:700,color:'var(--text2)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'1px' }}>Choose an Avatar</p>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'8px' }}>
                {PRESET_AVATARS.map(emoji => (
                  <button key={emoji} onClick={() => { setAvatar(emoji); setShowPicker(false); }}
                    style={{ fontSize:'20px',padding:'8px 4px',borderRadius:'8px',border: avatar===emoji ? '2px solid var(--orange)' : '1px solid var(--border)',background: avatar===emoji ? 'rgba(249,115,22,0.12)' : 'var(--card)',cursor:'pointer',transition:'all 0.15s',lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center',minWidth:0,overflow:'hidden' }}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Flash message */}
        {msg.text && (
          <div style={{ margin:'14px 26px 0',padding:'11px 14px',borderRadius:'9px',fontSize:'13px',
            background: msg.type==='error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${msg.type==='error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            color: msg.type==='error' ? 'var(--red)' : 'var(--green)',
          }}>
            {msg.text}
          </div>
        )}

        {/* Form fields */}
        <div style={{ padding:'20px 26px',flex:1,display:'flex',flexDirection:'column',gap:'20px' }}>

          {/* Name */}
          <div>
            <label style={{ fontSize:'11px',fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'7px' }}>Display Name</label>
            <div style={{ display:'flex',gap:'8px' }}>
              <input value={name} onChange={e => setName(e.target.value)} style={{ ...inp,flex:1 }} disabled={daysLeft>0}
                placeholder="Your name"
                onFocus={e=>e.target.style.borderColor='var(--orange)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'} />
              <button onClick={handleSaveName} disabled={loading||daysLeft>0||name===user.name} style={btnOrange}>Save</button>
            </div>
            {daysLeft > 0
              ? <p style={{ color:'var(--yellow)',fontSize:'12px',marginTop:'5px' }}>🔒 Can change again in {daysLeft} day{daysLeft>1?'s':''}</p>
              : nameMsg ? <p style={{ color:'var(--red)',fontSize:'12px',marginTop:'5px' }}>⚠️ {nameMsg}</p> : null
            }
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize:'11px',fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'1px',display:'block',marginBottom:'7px' }}>Email Address</label>
            <div style={{ display:'flex',gap:'8px' }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inp,flex:1 }}
                placeholder="your@email.com"
                onFocus={e=>e.target.style.borderColor='var(--orange)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'} />
              <button onClick={handleSaveEmail} disabled={loading||email===user.email} style={btnOrange}>Save</button>
            </div>
          </div>

          {/* Info */}
          <div style={{ background:'var(--bg2)',borderRadius:'11px',padding:'14px',border:'1px solid var(--border)' }}>
            <div style={{ fontSize:'11px',fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'10px' }}>Account Info</div>
            {[['📱 Phone', user.phone||'Not provided'],['🗓️ Member since', new Date(user.createdAt||Date.now()).toLocaleDateString('en-US',{year:'numeric',month:'long'})],['🔐 Password','••••••••']].map(([k,v])=>(
              <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'13px' }}>
                <span style={{ color:'var(--text2)' }}>{k}</span>
                <span style={{ color:'var(--text)',maxWidth:'55%',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding:'18px 26px',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:'9px',flexShrink:0 }}>
          <button onClick={() => { logout(); onClose(); }}
            style={{ padding:'11px',border:'1px solid var(--border)',borderRadius:'10px',background:'var(--card)',color:'var(--text2)',fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:'14px',cursor:'pointer' }}>
            🚪 Sign Out
          </button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding:'11px',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',background:'rgba(239,68,68,0.05)',color:'var(--red)',fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:'14px',cursor:'pointer' }}>
            🗑️ Delete Account Permanently
          </button>
        </div>
      </div>
    </>
  );
};

export default UserProfileModal;

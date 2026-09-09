import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const STEPS = [
  { key: 'pending',   label: 'Order Placed',    desc: 'Awaiting kitchen',             icon: '📝' },
  { key: 'preparing', label: 'Preparing',        desc: 'Chef is cooking!',             icon: '🍳' },
  { key: 'ready',     label: 'Ready!',           desc: 'Hot & fresh for pickup',       icon: '🛍️' },
  { key: 'done',      label: 'Delivered',        desc: 'Enjoy your meal!',             icon: '🎉' },
];

const STATUS_GRADIENT = {
  pending:   'linear-gradient(135deg,#f59e0b,#d97706)',
  preparing: 'linear-gradient(135deg,#3b82f6,#2563eb)',
  ready:     'linear-gradient(135deg,#10b981,#059669)',
  done:      'linear-gradient(135deg,#f97316,#ea580c)',
};

const STATUS_GLOW = {
  pending:   'rgba(245,158,11,0.35)',
  preparing: 'rgba(59,130,246,0.35)',
  ready:     'rgba(16,185,129,0.35)',
  done:      'rgba(249,115,22,0.35)',
};

// ─────────────────────────────────────────────────────────────────────────────
const TrackOrdersPage = () => {
  const { user, isLoggedIn } = useAuth();
  const [orders,  setOrders]  = useState([]);
  const [timers,  setTimers]  = useState({});
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);   // entrance animation flag
  const prevUserIdRef = useRef(null);

  // ── Fetch active orders scoped to the current user ────────────────────────
  const fetchActiveOrders = async (currentUser) => {
    if (!currentUser) return;
    try {
      const uid  = currentUser._id || currentUser.id;
      const res  = await fetch(`${API}/api/orders/user/${uid}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const active = data.filter(o =>
          ['pending', 'preparing', 'ready'].includes(o.status) &&
          (Date.now() - new Date(o.createdAt).getTime()) < 24 * 60 * 60 * 1000
        );
        setOrders(active);
      }
    } catch (err) {
      console.error('Error fetching active orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Clear + reload when user changes ─────────────────────────────────────
  useEffect(() => {
    const currentId = user?._id || user?.id || null;
    if (currentId !== prevUserIdRef.current) {
      setOrders([]);
      setTimers({});
      setVisible(false);
      prevUserIdRef.current = currentId;
    }
    if (!isLoggedIn || !user) return;
    setLoading(true);
    fetchActiveOrders(user);
    const interval = setInterval(() => fetchActiveOrders(user), 7000);
    return () => clearInterval(interval);
  }, [user, isLoggedIn]);

  // Trigger entrance animation once data is ready
  useEffect(() => {
    if (!loading && (orders.length > 0 || isLoggedIn)) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [loading, orders, isLoggedIn]);

  // ── Countdown timers ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const next = {};
      orders.forEach(o => {
        const elapsed   = Date.now() - new Date(o.createdAt).getTime();
        const remaining = 5 * 60 * 1000 - elapsed;
        if (remaining > 0) {
          const s = Math.floor(remaining / 1000);
          next[o._id] = `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
        } else {
          next[o._id] = null;
        }
      });
      setTimers(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [orders]);

  // ── Cancel handler ────────────────────────────────────────────────────────
  const handleCancel = async (orderId) => {
    if (!window.confirm('⚠️ Are you sure you want to cancel this order?')) return;
    try {
      const res  = await fetch(`${API}/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOrders(prev => prev.filter(o => o._id !== orderId));
      } else {
        alert(data.message || 'Failed to cancel order.');
      }
    } catch {
      alert('Could not reach server. Please try again.');
    }
  };

  // ── Final Confirm handler ──────────────────────────────────────────────────
  // Customer is sure — locks the order so chef can cook immediately
  const handleFinalConfirm = async (orderId) => {
    if (!window.confirm(
      '🔒 Final Confirm?\n\nThis will allow the chef to start cooking RIGHT NOW.\nYou will NOT be able to cancel after this.'
    )) return;
    try {
      const res  = await fetch(`${API}/api/orders/${orderId}/lock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Mark as locked in local state immediately (don't wait for next poll)
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, locked: true } : o));
      } else {
        alert(data.message || 'Could not lock the order.');
      }
    } catch {
      alert('Could not reach server. Please try again.');
    }
  };

  // ── CSS animations injected once ─────────────────────────────────────────
  const ANIMATIONS = `
    @keyframes fadeInUp {
      from { opacity:0; transform:translateY(32px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes fadeInDown {
      from { opacity:0; transform:translateY(-20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes pulseGlow {
      0%,100% { box-shadow: 0 0 0 0 var(--glow); transform: scale(1.15); }
      50%      { box-shadow: 0 0 22px 6px var(--glow); transform: scale(1.22); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes floatIcon {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(-10px); }
    }
    @keyframes livePing {
      0%   { transform:scale(1); opacity:1; }
      100% { transform:scale(2.2); opacity:0; }
    }
    @keyframes spinSlow {
      to { transform: rotate(360deg); }
    }
    @keyframes progressPulse {
      0%,100% { opacity:1; }
      50%      { opacity:0.7; }
    }
  `;

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <style>{ANIMATIONS}</style>
        <div style={S.outerWrap}>
          <div style={{ ...S.emptyCard, animation: 'fadeInUp 0.5s ease both' }}>
            <div style={{ fontSize:'64px', marginBottom:'20px', animation:'floatIcon 3s ease-in-out infinite' }}>🔐</div>
            <h2 style={S.emptyTitle}>Sign In to Track Orders</h2>
            <p style={S.emptyDesc}>Please log in to see your active order status in real time.</p>
          </div>
        </div>
      </>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{ANIMATIONS}</style>
        <div style={S.outerWrap}>
          <div style={{ ...S.emptyCard, animation: 'fadeInUp 0.5s ease both' }}>
            <div style={{ fontSize:'52px', marginBottom:'20px', animation:'spinSlow 1.4s linear infinite', display:'inline-block' }}>⏳</div>
            <h2 style={S.emptyTitle}>Fetching your orders…</h2>
            <p style={S.emptyDesc}>Connecting to the kitchen. Please wait a moment.</p>
          </div>
        </div>
      </>
    );
  }

  // ── No active orders ──────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <>
        <style>{ANIMATIONS}</style>
        <div style={S.outerWrap}>
          <div style={{ ...S.emptyCard, animation: 'fadeInUp 0.5s ease both' }}>
            <div style={{ fontSize:'72px', marginBottom:'20px', animation:'floatIcon 3s ease-in-out infinite' }}>🍽️</div>
            <h2 style={S.emptyTitle}>No Active Orders</h2>
            <p style={S.emptyDesc}>
              You don't have any orders being prepared right now.
              Place an order and track it here in real time!
            </p>
            <div style={{ marginTop:'20px', padding:'12px 20px', background:'rgba(249,115,22,0.08)', borderRadius:'12px', border:'1px solid rgba(249,115,22,0.2)', fontSize:'13px', color:'var(--text3)' }}>
              🔄 Auto-refreshes every 7 seconds
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main orders list ──────────────────────────────────────────────────────
  return (
    <>
      <style>{ANIMATIONS}</style>
      <div style={S.page}>

        {/* ── Page Header ── */}
        <div style={{
          ...S.header,
          opacity:  visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <div>
            <h1 style={S.pageTitle}>🚚 Track Your Orders</h1>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'6px' }}>
              {/* Pulsing live dot */}
              <span style={{ position:'relative', display:'inline-flex', width:'10px', height:'10px' }}>
                <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:'var(--green)', animation:'livePing 1.4s ease-out infinite' }} />
                <span style={{ position:'relative', width:'10px', height:'10px', borderRadius:'50%', background:'var(--green)' }} />
              </span>
              <p style={S.pageSubtitle}>Live updates · Auto-refreshes every 7 seconds</p>
            </div>
          </div>
          <span style={S.badge}>
            {orders.length} active order{orders.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Order Cards ── */}
        <div style={S.grid}>
          {orders.map((order, cardIdx) => {
            const stepIdx     = STEPS.findIndex(s => s.key === order.status);
            const cancelLeft  = timers[order._id];
            const progressPct = stepIdx <= 0 ? 0 : (stepIdx / (STEPS.length - 1)) * 100;
            const glow        = STATUS_GLOW[order.status] || 'rgba(249,115,22,0.35)';

            return (
              <div
                key={order._id}
                style={{
                  ...S.card,
                  opacity:   visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `opacity 0.55s ease ${0.1 + cardIdx * 0.12}s, transform 0.55s ease ${0.1 + cardIdx * 0.12}s, box-shadow 0.25s`,
                  boxShadow: `0 8px 40px ${glow}`,
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 16px 60px ${glow}`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = `0 8px 40px ${glow}`}
              >
                {/* ── Coloured Ribbon ── */}
                <div style={{ ...S.ribbon, background: STATUS_GRADIENT[order.status] }}>
                  <span style={S.ribbonId}>ORDER #{order._id.slice(-6).toUpperCase()}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    {/* Animated source badge */}
                    <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)', fontWeight:600 }}>
                      via {order.source === 'chat' ? '💬 Chat' : order.source === 'voice' ? '🎤 Voice' : '🛒 Cart'}
                    </span>
                    <span style={{ ...S.ribbonStatus, animation: order.status === 'preparing' ? 'progressPulse 1.5s ease-in-out infinite' : 'none' }}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={S.cardBody}>
                  {/* ── Items & Total ── */}
                  <div style={S.itemsRow}>
                    <div style={S.itemsList}>
                      {order.items.map((it, i) => (
                        <span key={i} style={S.itemChip}>
                          {it.quantity}× {it.name}
                        </span>
                      ))}
                    </div>
                    <span style={S.total}>Rs {order.total}</span>
                  </div>

                  {/* ── Placed Time ── */}
                  <p style={S.timeText}>
                    🕐 Placed at {new Date(order.createdAt).toLocaleTimeString('en-US',{
                      hour:'2-digit', minute:'2-digit', hour12:true,
                    })}
                  </p>

                  {/* ── Animated Progress Bar ── */}
                  <div style={{ marginBottom:'28px' }}>
                    <div style={{ height:'8px', background:'var(--border)', borderRadius:'4px', overflow:'hidden', position:'relative' }}>
                      <div style={{
                        height:'100%',
                        borderRadius:'4px',
                        background: STATUS_GRADIENT[order.status],
                        width: `${progressPct}%`,
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {/* Shimmer overlay on the bar */}
                        {order.status === 'preparing' && (
                          <div style={{
                            position:'absolute', inset:0,
                            background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%)',
                            backgroundSize:'200% 100%',
                            animation:'shimmer 1.6s linear infinite',
                          }} />
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px', fontSize:'11px', color:'var(--text3)', fontWeight:600 }}>
                      <span>Placed</span><span>Preparing</span><span>Ready</span><span>Done</span>
                    </div>
                  </div>

                  {/* ── Step Bubbles ── */}
                  <div style={S.stepsRow}>
                    {STEPS.map((step, idx) => {
                      const done   = idx < stepIdx;
                      const active = idx === stepIdx;
                      return (
                        <div key={step.key} style={S.stepCol}>
                          <div style={{
                            ...S.bubble,
                            background: done || active ? STATUS_GRADIENT[order.status] : 'var(--bg2)',
                            border:     active ? '2.5px solid rgba(255,255,255,0.4)' : done ? 'none' : '2px solid var(--border)',
                            '--glow':   glow,
                            animation:  active ? 'pulseGlow 2s ease-in-out infinite' : 'none',
                            transform:  active ? 'scale(1.18)' : 'scale(1)',
                          }}>
                            <span style={{ fontSize:'18px' }}>{step.icon}</span>
                          </div>
                          <span style={{
                            ...S.stepLabel,
                            color:      active ? 'var(--orange-light)' : done ? 'var(--text)' : 'var(--text3)',
                            fontWeight: active ? 800 : 600,
                          }}>
                            {step.label}
                          </span>
                          <span style={S.stepDesc}>{step.desc}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Cancel / Final Confirm Section ── */}
                  <div style={S.cancelRow}>
                    {order.locked ? (
                      // Customer already clicked Final Confirm — permanently locked
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <span style={{ fontSize:'20px' }}>🔒</span>
                        <div>
                          <span style={{ fontSize:'13px', color:'#f59e0b', fontWeight:800 }}>
                            Order Locked — Chef is cooking your food!
                          </span>
                          <p style={{ fontSize:'11px', color:'var(--text3)', margin:'2px 0 0' }}>
                            You confirmed this order. Cancellation is no longer possible.
                          </p>
                        </div>
                      </div>
                    ) : cancelLeft ? (
                      // Cancellation window still open — show both buttons
                      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                        <div style={S.cancelWrap}>
                          {/* Cancel button */}
                          <button
                            onClick={() => handleCancel(order._id)}
                            style={S.cancelBtn}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.04)';
                              e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.5)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.35)';
                            }}
                          >
                            ✕ Cancel Order
                          </button>
                          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                            <span style={{ fontSize:'12px', color:'#ef4444', fontWeight:800 }}>
                              ⏱ {cancelLeft} remaining
                            </span>
                            <span style={{ fontSize:'11px', color:'var(--text3)' }}>Cancel window closes soon</span>
                          </div>
                        </div>

                        {/* Final Confirm button — skip the wait, let chef cook NOW */}
                        <div style={{
                          display:'flex', alignItems:'center', gap:'14px',
                          padding:'12px 16px',
                          background:'rgba(245,158,11,0.07)',
                          border:'1px dashed rgba(245,158,11,0.4)',
                          borderRadius:'12px',
                        }}>
                          <button
                            onClick={() => handleFinalConfirm(order._id)}
                            style={{
                              background:'linear-gradient(135deg,#f59e0b,#d97706)',
                              border:'none', borderRadius:'10px', color:'#fff',
                              padding:'9px 20px', fontSize:'13px', fontWeight:800,
                              cursor:'pointer', fontFamily:'Inter,sans-serif',
                              boxShadow:'0 4px 14px rgba(245,158,11,0.4)',
                              transition:'transform 0.2s, box-shadow 0.2s',
                              whiteSpace:'nowrap',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.04)';
                              e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,158,11,0.55)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = '0 4px 14px rgba(245,158,11,0.4)';
                            }}
                          >
                            🔒 Final Confirm
                          </button>
                          <div>
                            <span style={{ fontSize:'12px', fontWeight:700, color:'#f59e0b' }}>
                              Sure about your order?
                            </span>
                            <p style={{ fontSize:'11px', color:'var(--text3)', margin:'2px 0 0' }}>
                              Lets the chef start cooking immediately — no cancellation after this.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'16px' }}>🔒</span>
                        <span style={S.lockedMsg}>Cancellation window closed — your order is with the kitchen!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    maxWidth: '900px',
    margin: '0 auto',
    /* paddingTop must clear the fixed navbar (~70px) + breathing room */
    padding: '100px 20px 80px',
  },
  outerWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '100px 20px 60px',  // clear fixed navbar
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '40px',
  },
  pageTitle: {
    fontSize: '34px',
    fontWeight: 900,
    background: 'linear-gradient(135deg,#f97316,#fbbf24)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
    lineHeight: 1.2,
  },
  pageSubtitle: {
    color: 'var(--text3)',
    fontSize: '13px',
    margin: 0,
  },
  badge: {
    background: 'rgba(249,115,22,0.12)',
    color: 'var(--orange-light)',
    border: '1px solid rgba(249,115,22,0.35)',
    borderRadius: '24px',
    padding: '7px 20px',
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '0.3px',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  card: {
    background: 'var(--card)',
    borderRadius: '22px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  ribbon: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '13px 22px',
  },
  ribbonId: {
    fontFamily: 'monospace',
    fontWeight: 800,
    fontSize: '13px',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: '1.5px',
  },
  ribbonStatus: {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '20px',
    padding: '3px 13px',
    fontSize: '11px',
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '1px',
  },
  cardBody: {
    padding: '24px 24px 20px',
  },
  itemsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  itemsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    flex: 1,
  },
  itemChip: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '4px 13px',
    fontSize: '13px',
    color: 'var(--text2)',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  total: {
    fontSize: '24px',
    fontWeight: 900,
    color: 'var(--orange-light)',
    whiteSpace: 'nowrap',
  },
  timeText: {
    fontSize: '12px',
    color: 'var(--text3)',
    marginBottom: '20px',
    marginTop: '4px',
  },
  stepsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  stepCol: {
    flex: 1,
    minWidth: '70px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    textAlign: 'center',
  },
  bubble: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: '12px',
    lineHeight: 1.2,
    transition: 'color 0.3s',
  },
  stepDesc: {
    fontSize: '10px',
    color: 'var(--text3)',
    lineHeight: 1.3,
  },
  cancelRow: {
    borderTop: '1px solid var(--border)',
    paddingTop: '16px',
  },
  cancelWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  cancelBtn: {
    background: 'linear-gradient(135deg,#ef4444,#dc2626)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    padding: '9px 22px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'Inter,sans-serif',
    boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  lockedMsg: {
    fontSize: '13px',
    color: 'var(--text3)',
    fontWeight: 600,
  },
  emptyCard: {
    textAlign: 'center',
    maxWidth: '420px',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
    padding: '52px 40px',
    boxShadow: '0 8px 60px rgba(0,0,0,0.2)',
  },
  emptyTitle: {
    fontSize: '26px',
    fontWeight: 900,
    marginBottom: '12px',
    background: 'linear-gradient(135deg,#f97316,#ea580c)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  emptyDesc: {
    color: 'var(--text3)',
    fontSize: '14px',
    lineHeight: 1.75,
  },
};

export default TrackOrdersPage;

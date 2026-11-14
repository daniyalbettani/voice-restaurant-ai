import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const STATUS_COLOR = {
  pending:   { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: '⏳ Pending'   },
  preparing: { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6',  label: '🍳 Preparing' },
  ready:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981',  label: '✅ Ready'      },
  delivered: { bg: 'rgba(249,115,22,0.12)',  color: '#f97316',  label: '🎉 Delivered' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444',  label: '✕ Cancelled'  },
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) +
  ' · ' +
  new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

// ─────────────────────────────────────────────────────────────────────────────
const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const { refreshCart, setCartOpen } = useCart();

  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [reordering, setReordering] = useState(null); // order _id being reordered
  const [filter,   setFilter]   = useState('all');   // 'all' | 'pending' | 'delivered' | 'cancelled'
  const [visible,  setVisible]  = useState(false);

  // ── Fetch all orders ───────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('vb_token');
      const res   = await fetch(`${API}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      const arr   = data?.data ?? data;
      if (Array.isArray(arr)) {
        const normalised = arr.map(o => ({
          ...o,
          status: (o.orderStatus || o.status || '').toLowerCase(),
          total:  o.totalAmount ?? o.total ?? 0,
        }));
        setOrders(normalised);
        setTimeout(() => setVisible(true), 60);
      }
    } catch (err) {
      console.error('OrderHistory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Reorder last meal ──────────────────────────────────────────────────────
  const handleReorder = async (orderId) => {
    setReordering(orderId);
    try {
      const token = localStorage.getItem('vb_token');
      const res   = await fetch(`${API}/api/orders/reorder`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      if (res.ok) {
        await refreshCart();
        setCartOpen(true);
      } else {
        alert(data.message || 'Could not add items to cart.');
      }
    } catch {
      alert('Could not reach server. Please try again.');
    } finally {
      setReordering(null);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={S.centreWrap}>
        <div style={S.emptyCard}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔐</div>
          <h2 style={S.emptyTitle}>Sign In to View Orders</h2>
          <p style={S.emptyDesc}>Please log in to see your full order history.</p>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.centreWrap}>
        <div style={S.emptyCard}>
          <div style={{ fontSize: '52px', marginBottom: '20px', animation: 'spin 1.4s linear infinite', display: 'inline-block' }}>⏳</div>
          <h2 style={S.emptyTitle}>Loading your orders…</h2>
        </div>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (orders.length === 0) {
    return (
      <div style={S.centreWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }`}</style>
        <div style={S.emptyCard}>
          <div style={{ fontSize: '72px', marginBottom: '20px', animation: 'float 3s ease-in-out infinite' }}>🍽️</div>
          <h2 style={S.emptyTitle}>No Orders Yet</h2>
          <p style={S.emptyDesc}>You haven't placed any orders yet. Browse the menu and try something delicious!</p>
          <button onClick={() => navigate('/')} style={S.ctaBtn}>Browse Menu</button>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
      <div style={S.page}>

        {/* Header */}
        <div style={{ ...S.header, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(-16px)', transition: 'all 0.4s ease' }}>
          <div>
            <h1 style={S.pageTitle}>📦 Order History</h1>
            <p style={{ color: 'var(--text3)', fontSize: '14px', margin: '4px 0 0' }}>
              {orders.length} order{orders.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button onClick={() => navigate('/track-orders')} style={{ ...S.ctaBtn, padding: '9px 18px', fontSize: '13px' }}>
            🚚 Track Active
          </button>
        </div>

        {/* Filter tabs */}
        <div style={S.filterRow}>
          {['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700,
                fontFamily: 'Inter,sans-serif', cursor: 'pointer', transition: 'all 0.2s',
                border: filter === f ? 'none' : '1px solid var(--border)',
                background: filter === f ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'var(--card)',
                color: filter === f ? '#fff' : 'var(--text2)',
              }}
            >
              {f === 'all' ? `All (${orders.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* No results for filter */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)', fontSize: '15px' }}>
            No {filter} orders found.
          </div>
        )}

        {/* Order cards */}
        <div style={S.list}>
          {filtered.map((order, idx) => {
            const sc = STATUS_COLOR[order.status] || STATUS_COLOR.pending;
            const isLastOrder = idx === 0 && order.status !== 'cancelled';
            const busy = reordering === order._id;

            return (
              <div
                key={order._id}
                style={{
                  ...S.card,
                  opacity:    visible ? 1 : 0,
                  transform:  visible ? 'none' : 'translateY(28px)',
                  transition: `opacity 0.5s ease ${0.08 * idx}s, transform 0.5s ease ${0.08 * idx}s`,
                }}
              >
                {/* Card header */}
                <div style={S.cardTop}>
                  <div>
                    <span style={S.orderId}>ORDER #{order._id.slice(-6).toUpperCase()}</span>
                    <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '3px 0 0' }}>{fmtDate(order.createdAt)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Source badge */}
                    <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>
                      {order.source?.toUpperCase() === 'VOICE' ? '🎤 Voice' : order.source?.toUpperCase() === 'CHAT' ? '💬 Chat' : '🛒 Cart'}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div style={S.itemsWrap}>
                  <div style={S.itemsList}>
                    {order.items.map((it, i) => (
                      <span key={i} style={S.chip}>{it.quantity}× {it.name}</span>
                    ))}
                  </div>
                  <span style={S.total}>Rs {order.total}</span>
                </div>

                {/* Delivery info (if captured) */}
                {order.deliveryAddress?.city && (
                  <div style={{ fontSize: '12px', color: 'var(--text3)', margin: '8px 0 0', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span>📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}</span>
                    {order.deliveryAddress.phone && <span>📞 {order.deliveryAddress.phone}</span>}
                    <span>💳 {order.paymentMethod || 'COD'}</span>
                  </div>
                )}

                {/* Note */}
                {order.customerNote && (
                  <div style={{ fontSize: '12px', color: 'var(--text3)', margin: '6px 0 0', fontStyle: 'italic' }}>
                    📝 "{order.customerNote}"
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Reorder — only shown for the most recent non-cancelled order */}
                  {isLastOrder && (
                    <button
                      onClick={() => handleReorder(order._id)}
                      disabled={busy}
                      style={{
                        padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                        fontFamily: 'Inter,sans-serif', cursor: busy ? 'not-allowed' : 'pointer',
                        border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)',
                        color: '#fff', opacity: busy ? 0.7 : 1, transition: 'opacity 0.2s',
                        boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                      }}
                    >
                      {busy ? '⏳ Adding…' : '🔄 Reorder This Meal'}
                    </button>
                  )}

                  {/* Track — if the order is still active */}
                  {['pending', 'preparing', 'ready'].includes(order.status) && (
                    <button
                      onClick={() => navigate('/track-orders')}
                      style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, fontFamily: 'Inter,sans-serif', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', transition: 'all 0.2s' }}
                    >
                      🚚 Track Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: { maxWidth: '860px', margin: '0 auto', padding: '100px 20px 80px' },
  centreWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '100px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' },
  pageTitle: { fontSize: '32px', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#f97316,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' },
  list: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px 22px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' },
  orderId: { fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', letterSpacing: '1px', color: 'var(--text)' },
  itemsWrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' },
  itemsList: { display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 },
  chip: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', color: 'var(--text2)', fontWeight: 600 },
  total: { fontSize: '22px', fontWeight: 900, color: 'var(--orange-light)', whiteSpace: 'nowrap' },
  emptyCard: { textAlign: 'center', maxWidth: '400px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '52px 40px', boxShadow: '0 8px 60px rgba(0,0,0,0.2)' },
  emptyTitle: { fontSize: '24px', fontWeight: 900, marginBottom: '12px', background: 'linear-gradient(135deg,#f97316,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  emptyDesc: { color: 'var(--text3)', fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' },
  ctaBtn: { padding: '11px 24px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' },
};

export default OrderHistoryPage;

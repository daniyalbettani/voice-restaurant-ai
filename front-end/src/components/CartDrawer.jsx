import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CartDrawer = () => {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, cartTotal } = useCart();
  const { user, isLoggedIn } = useAuth();
  const [placing,    setPlacing]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [orderNum,   setOrderNum]   = useState('');

  if (!cartOpen) return null;

  /* ── Place Order (called after confirmation) ─────────────── */
  const submitOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const res = await fetch(`${API}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
          total: cartTotal,
          userId: isLoggedIn ? (user._id || user.id) : null,
          source: 'cart',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderNum(data.order._id.slice(-6).toUpperCase());
        setSuccess(true);
        setConfirming(false);
        clearCart();
        setTimeout(() => { setSuccess(false); setCartOpen(false); }, 4500);
      }
    } catch (err) { console.error(err); }
    finally { setPlacing(false); }
  };

  const handlePlaceOrder = () => {
    if (!isLoggedIn) {
      // This will be caught by CartContext auth gate but in case cart already has items
      alert('Please sign in to place an order.');
      return;
    }
    setConfirming(true); // show confirmation screen first
  };

  /* ── Shared Styles ─────────────────────────────────────────── */
  const drawerStyle = {
    position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
    width: '100%', maxWidth: '400px', background: 'var(--bg3)',
    borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
    animation: 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { setCartOpen(false); setConfirming(false); }}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s' }}
      />

      <div style={drawerStyle}>
        {/* ── Header ─────────────────────────────────── */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>{confirming ? '✅' : '🛒'}</span>
            <h2 style={{ fontWeight: 800, fontSize: '20px' }}>
              {confirming ? 'Confirm Order' : 'Your Cart'}
            </h2>
            {!confirming && cart.length > 0 && (
              <span style={{ background: 'var(--orange)', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '13px', fontWeight: 700 }}>
                {cart.reduce((a, i) => a + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={() => { setCartOpen(false); setConfirming(false); }}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter,sans-serif' }}
          >✕</button>
        </div>

        {/* ── Success Screen ──────────────────────────── */}
        {success ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '8px', background: 'linear-gradient(135deg,#f97316,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Order Placed!</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '12px' }}>Your order is being prepared</p>
            <div style={{ padding: '12px 24px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', fontWeight: 800, fontSize: '18px', color: 'var(--orange-light)', letterSpacing: '2px' }}>
              #{orderNum}
            </div>
            <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '16px' }}>This window closes automatically…</p>
          </div>

        /* ── Confirmation Screen ────────────────────── */
        ) : confirming ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '16px' }}>Please review your order before confirming:</p>
              {cart.map(item => (
                <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{item.quantity} × {item.name}</span>
                  <span style={{ color: 'var(--orange-light)', fontWeight: 700 }}>Rs {item.price * item.quantity}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '8px', fontWeight: 900, fontSize: '18px' }}>
                <span>Total</span>
                <span style={{ color: 'var(--orange-light)' }}>Rs {cartTotal}</span>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={submitOrder} disabled={placing} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '12px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: '16px', cursor: 'pointer', opacity: placing ? 0.7 : 1 }}>
                {placing ? '⏳ Placing Order…' : '✅ Yes, Place Order'}
              </button>
              <button onClick={() => setConfirming(false)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text2)', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                ← Back to Cart
              </button>
            </div>
          </div>

        /* ── Cart Items ─────────────────────────────── */
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                  <div style={{ fontSize: '72px', marginBottom: '16px' }}>🛒</div>
                  <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Your cart is empty</h3>
                  <p style={{ color: 'var(--text2)', fontSize: '14px' }}>Add items from the menu below!</p>
                  <button
                    onClick={() => { setCartOpen(false); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); }}
                    style={{ marginTop: '20px', padding: '10px 24px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                  >Browse Menu</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cart.map(item => (
                    <div key={item._id} style={{ display: 'flex', gap: '14px', padding: '14px', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'center' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                          : (item.emoji || '🍽️')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', textTransform: 'capitalize', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ color: 'var(--orange-light)', fontWeight: 700, fontSize: '14px' }}>Rs {item.price * item.quantity}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button onClick={() => updateQty(item._id, item.quantity - 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 700, fontSize: '15px', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item._id, item.quantity + 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <button onClick={() => removeFromCart(item._id)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--text2)', fontSize: '15px' }}>Total</span>
                  <span style={{ fontWeight: 900, fontSize: '22px', color: 'var(--orange-light)' }}>Rs {cartTotal}</span>
                </div>
                <button onClick={handlePlaceOrder} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '12px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: '16px', cursor: 'pointer', marginBottom: '10px' }}>
                  🛍️ Place Order
                </button>
                <button onClick={clearCart} style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text2)', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Clear Cart
                </button>
                {!isLoggedIn && (
                  <p style={{ color: 'var(--text3)', fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>
                    💡 Sign in to save your order history
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;

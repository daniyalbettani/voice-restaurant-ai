import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ─── Step IDs ─────────────────────────────────────────────────────────────────
const STEP_CART     = 'cart';
const STEP_CHECKOUT = 'checkout';
const STEP_CONFIRM  = 'confirm';
const STEP_SUCCESS  = 'success';

const PAYMENT_OPTIONS = [
  { id: 'COD',   label: '💵 Cash on Delivery', desc: 'Pay when your food arrives' },
  { id: 'CARD',  label: '💳 Card on Delivery',  desc: 'Swipe at the door' },
  { id: 'JAZZ',  label: '📱 JazzCash',           desc: 'Mobile wallet payment' },
  { id: 'EASYPAISA', label: '📲 EasyPaisa',      desc: 'Mobile wallet payment' },
];

const CartDrawer = () => {
  const navigate = useNavigate();
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, cartTotal, loading } = useCart();
  const { user, isLoggedIn } = useAuth();

  const [step,       setStep]       = useState(STEP_CART);
  const [placing,    setPlacing]    = useState(false);
  const [orderNum,   setOrderNum]   = useState('');

  // Checkout form state
  const [address, setAddress] = useState({ street: '', city: '', phone: user?.phone || '' });
  const [payment, setPayment] = useState('COD');
  const [note,    setNote]    = useState('');
  const [errors,  setErrors]  = useState({});

  if (!cartOpen) return null;

  const closeDrawer = () => { setCartOpen(false); setStep(STEP_CART); };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateCheckout = () => {
    const e = {};
    if (!address.street.trim()) e.street = 'Street / area is required';
    if (!address.city.trim())   e.city   = 'City is required';
    if (!address.phone.trim())  e.phone  = 'Phone number is required';
    else if (!/^[0-9+\-\s]{7,15}$/.test(address.phone.trim())) e.phone = 'Enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Place Order ─────────────────────────────────────────────────────────────
  const submitOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const token = localStorage.getItem('vb_token');
      const res = await fetch(`${API}/api/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deliveryAddress: { street: address.street.trim(), city: address.city.trim(), phone: address.phone.trim() },
          paymentMethod:   payment,
          customerNote:    note.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const order = data.data || data;
        const id    = order?._id || order?.id || '';
        setOrderNum(id.toString().slice(-6).toUpperCase());
        setStep(STEP_SUCCESS);
        await clearCart();
        // Reset form for next use
        setAddress({ street: '', city: '', phone: '' });
        setPayment('COD');
        setNote('');
        setErrors({});
        setTimeout(() => { setStep(STEP_CART); closeDrawer(); }, 5000);
      } else {
        alert(data.message || 'Failed to place order. Please try again.');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Could not reach server. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputStyle = (err) => ({
    width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px',
    background: 'var(--bg2)', color: 'var(--text)', fontFamily: 'Inter,sans-serif',
    border: `1.5px solid ${err ? '#ef4444' : 'var(--border)'}`,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  });
  const labelStyle = { fontSize: '12px', fontWeight: 700, color: 'var(--text2)', marginBottom: '5px', display: 'block' };
  const errStyle   = { fontSize: '11px', color: '#ef4444', marginTop: '3px' };

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s' }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: '100%', maxWidth: '420px', background: 'var(--bg3)',
        borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>
              {step === STEP_SUCCESS ? '🎉' : step === STEP_CHECKOUT ? '📋' : step === STEP_CONFIRM ? '✅' : '🛒'}
            </span>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: '18px', margin: 0 }}>
                {step === STEP_SUCCESS ? 'Order Placed!' : step === STEP_CHECKOUT ? 'Delivery & Payment' : step === STEP_CONFIRM ? 'Confirm Order' : 'Your Cart'}
              </h2>
              {step !== STEP_SUCCESS && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
                  {[STEP_CART, STEP_CHECKOUT, STEP_CONFIRM].map((s, i) => (
                    <div key={s} style={{ width: '28px', height: '3px', borderRadius: '2px', background: [STEP_CART, STEP_CHECKOUT, STEP_CONFIRM].indexOf(step) >= i ? 'var(--orange)' : 'var(--border)', transition: 'background 0.3s' }} />
                  ))}
                </div>
              )}
            </div>
            {step === STEP_CART && cart.length > 0 && (
              <span style={{ background: 'var(--orange)', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '13px', fontWeight: 700 }}>
                {cart.reduce((a, i) => a + i.quantity, 0)}
              </span>
            )}
          </div>
          <button onClick={closeDrawer} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter,sans-serif' }}>✕</button>
        </div>

        {/* Loading shimmer */}
        {loading && (
          <div style={{ padding: '20px 24px', color: 'var(--text3)', fontSize: '14px', textAlign: 'center' }}>Loading cart…</div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP: SUCCESS
        ══════════════════════════════════════════════════════════════ */}
        {step === STEP_SUCCESS && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '8px', background: 'linear-gradient(135deg,#f97316,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Order Placed!</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '12px' }}>Your order is heading to the kitchen!</p>
            <div style={{ padding: '12px 28px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', fontWeight: 800, fontSize: '20px', color: 'var(--orange-light)', letterSpacing: '2px' }}>
              #{orderNum}
            </div>
            <button
              onClick={() => { closeDrawer(); navigate('/track-orders'); }}
              style={{ marginTop: '20px', padding: '10px 24px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              🚚 Track My Order
            </button>
            <p style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '12px' }}>This window closes automatically…</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP: CART
        ══════════════════════════════════════════════════════════════ */}
        {step === STEP_CART && !loading && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                  <div style={{ fontSize: '72px', marginBottom: '16px' }}>🛒</div>
                  <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Your cart is empty</h3>
                  <p style={{ color: 'var(--text2)', fontSize: '14px' }}>Add items from the menu below!</p>
                  <button
                    onClick={() => {
                      closeDrawer();
                      const menuEl = document.getElementById('menu');
                      if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
                      else { navigate('/'); setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }), 400); }
                    }}
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
                <button
                  onClick={() => {
                    if (!isLoggedIn) { alert('Please sign in to place an order.'); return; }
                    // Pre-fill phone from user profile
                    setAddress(a => ({ ...a, phone: a.phone || user?.phone || '' }));
                    setStep(STEP_CHECKOUT);
                  }}
                  style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '12px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: '16px', cursor: 'pointer', marginBottom: '10px' }}
                >
                  🛍️ Proceed to Checkout →
                </button>
                <button onClick={clearCart} style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text2)', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                  Clear Cart
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP: CHECKOUT  — delivery address + payment method
        ══════════════════════════════════════════════════════════════ */}
        {step === STEP_CHECKOUT && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Delivery Address */}
              <div style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span> Delivery Address
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Street / Area *</label>
                    <input
                      style={inputStyle(errors.street)}
                      placeholder="e.g. 12-B, Gulshan Block 7"
                      value={address.street}
                      onChange={e => { setAddress(a => ({ ...a, street: e.target.value })); setErrors(er => ({ ...er, street: '' })); }}
                    />
                    {errors.street && <p style={errStyle}>{errors.street}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>City *</label>
                    <input
                      style={inputStyle(errors.city)}
                      placeholder="e.g. Karachi"
                      value={address.city}
                      onChange={e => { setAddress(a => ({ ...a, city: e.target.value })); setErrors(er => ({ ...er, city: '' })); }}
                    />
                    {errors.city && <p style={errStyle}>{errors.city}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number *</label>
                    <input
                      style={inputStyle(errors.phone)}
                      placeholder="e.g. 03001234567"
                      value={address.phone}
                      onChange={e => { setAddress(a => ({ ...a, phone: e.target.value })); setErrors(er => ({ ...er, phone: '' })); }}
                    />
                    {errors.phone && <p style={errStyle}>{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💳</span> Payment Method
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '10px', cursor: 'pointer', border: `1.5px solid ${payment === opt.id ? 'var(--orange)' : 'var(--border)'}`, background: payment === opt.id ? 'rgba(249,115,22,0.07)' : 'transparent', transition: 'all 0.2s' }}>
                      <input type="radio" name="payment" value={opt.id} checked={payment === opt.id} onChange={() => setPayment(opt.id)} style={{ accentColor: 'var(--orange)', width: '16px', height: '16px' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{opt.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label style={labelStyle}>Special Instructions (optional)</label>
                <textarea
                  style={{ ...inputStyle(false), minHeight: '70px', resize: 'vertical' }}
                  placeholder="e.g. Extra spicy, no onions, ring the bell…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { if (validateCheckout()) setStep(STEP_CONFIRM); }}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '12px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: '16px', cursor: 'pointer' }}
              >
                Review Order →
              </button>
              <button onClick={() => setStep(STEP_CART)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text2)', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                ← Back to Cart
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP: CONFIRM — order summary before final submit
        ══════════════════════════════════════════════════════════════ */}
        {step === STEP_CONFIRM && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Items */}
              <div style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>🧾 Order Summary</div>
                {cart.map(item => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{item.quantity} × {item.name}</span>
                    <span style={{ color: 'var(--orange-light)', fontWeight: 700 }}>Rs {item.price * item.quantity}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontWeight: 900, fontSize: '18px' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--orange-light)' }}>Rs {cartTotal}</span>
                </div>
              </div>

              {/* Delivery info */}
              <div style={{ background: 'var(--bg2)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)', fontSize: '13px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '10px' }}>📍 Delivery Details</div>
                <div style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
                  <div>📌 {address.street}, {address.city}</div>
                  <div>📞 {address.phone}</div>
                  <div style={{ marginTop: '6px', fontWeight: 700, color: 'var(--text)' }}>
                    {PAYMENT_OPTIONS.find(o => o.id === payment)?.label}
                  </div>
                  {note && <div style={{ marginTop: '6px', color: 'var(--text3)', fontStyle: 'italic' }}>📝 "{note}"</div>}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={submitOrder} disabled={placing} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '12px', color: '#fff', fontFamily: 'Inter,sans-serif', fontWeight: 800, fontSize: '16px', cursor: 'pointer', opacity: placing ? 0.7 : 1 }}>
                {placing ? '⏳ Placing Order…' : '✅ Place Order Now'}
              </button>
              <button onClick={() => setStep(STEP_CHECKOUT)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text2)', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                ← Edit Details
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default CartDrawer;

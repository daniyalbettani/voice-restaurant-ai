import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const STEP_CART     = 'cart';
const STEP_CHECKOUT = 'checkout';
const STEP_CONFIRM  = 'confirm';
const STEP_SUCCESS  = 'success';

const PAYMENT_OPTIONS = [
  { id: 'COD',       label: '💵 Cash on Delivery', desc: 'Pay when food arrives'    },
  { id: 'CARD',      label: '💳 Card on Delivery',  desc: 'Swipe at the door'        },
  { id: 'JAZZ',      label: '📱 JazzCash',           desc: 'Mobile wallet payment'   },
  { id: 'EASYPAISA', label: '📲 EasyPaisa',          desc: 'Mobile wallet payment'   },
];

// Shared style helpers
const inp = (err) => ({
  width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px',
  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter,sans-serif',
  border: `1.5px solid ${err ? '#ef4444' : 'var(--border)'}`,
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
});
const lbl = { fontSize: '12px', fontWeight: 700, color: 'var(--text2)', marginBottom: '5px', display: 'block' };
const err = { fontSize: '11px', color: '#ef4444', marginTop: '3px' };

// ─── Step progress dots ───────────────────────────────────────────────────────
const STEPS_ORDER = [STEP_CART, STEP_CHECKOUT, STEP_CONFIRM];
const StepDots = ({ step }) => (
  <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
    {STEPS_ORDER.map((s, i) => (
      <div key={s} style={{
        width: '28px', height: '3px', borderRadius: '2px', transition: 'background 0.3s',
        background: STEPS_ORDER.indexOf(step) >= i ? 'var(--orange)' : 'var(--border)',
      }} />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const CartDrawer = () => {
  const navigate  = useNavigate();
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, cartTotal, loading } = useCart();
  const { user, isLoggedIn } = useAuth();

  const [step,     setStep]     = useState(STEP_CART);
  const [placing,  setPlacing]  = useState(false);
  const [orderNum, setOrderNum] = useState('');

  const [address, setAddress] = useState({ street: '', city: '', phone: '' });
  const [payment, setPayment] = useState('COD');
  const [note,    setNote]    = useState('');
  const [errors,  setErrors]  = useState({});

  if (!cartOpen) return null;

  const closeDrawer = () => { setCartOpen(false); setStep(STEP_CART); };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!address.street.trim())                                   e.street = 'Street / area is required';
    if (!address.city.trim())                                     e.city   = 'City is required';
    if (!address.phone.trim())                                    e.phone  = 'Phone number is required';
    else if (!/^[0-9+\-\s]{7,15}$/.test(address.phone.trim())) e.phone  = 'Enter a valid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Place Order ─────────────────────────────────────────────────────────────
  const submitOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const token = localStorage.getItem('vb_token');
      const res   = await fetch(`${API}/api/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          deliveryAddress: { street: address.street.trim(), city: address.city.trim(), phone: address.phone.trim() },
          paymentMethod:   payment,
          customerNote:    note.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const order = data.data || data;
        setOrderNum((order?._id || '').toString().slice(-6).toUpperCase());
        setStep(STEP_SUCCESS);
        await clearCart();
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER ICON / TITLE
  // ═══════════════════════════════════════════════════════════════════════════
  const headerIcon  = step === STEP_SUCCESS ? '🎉' : step === STEP_CHECKOUT ? '📋' : step === STEP_CONFIRM ? '✅' : '🛒';
  const headerTitle = step === STEP_SUCCESS ? 'Order Placed!' : step === STEP_CHECKOUT ? 'Delivery & Payment' : step === STEP_CONFIRM ? 'Confirm Order' : 'Your Cart';

  return (
    <>
      {/* Backdrop */}
      <div onClick={closeDrawer} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', animation:'fadeIn 0.2s' }} />

      {/*
        ── Drawer shell ──────────────────────────────────────────────────────
        IMPORTANT: `overflow: hidden` + explicit height (`top/bottom: 0`)
        is the key that enables inner flex-scroll to work on all screen sizes.
      */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, zIndex:201,
        width:'100%', maxWidth:'420px',
        background:'var(--bg3)', borderLeft:'1px solid var(--border)',
        display:'flex', flexDirection:'column',
        overflow:'hidden',                        /* ← critical */
        animation:'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* ── HEADER (fixed height, never scrolls) ─────────────────────── */}
        <div style={{ flexShrink:0, padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
            <span style={{ fontSize:'22px', flexShrink:0 }}>{headerIcon}</span>
            <div style={{ minWidth:0 }}>
              <h2 style={{ fontWeight:800, fontSize:'17px', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{headerTitle}</h2>
              {step !== STEP_SUCCESS && <StepDots step={step} />}
            </div>
            {step === STEP_CART && cart.length > 0 && (
              <span style={{ background:'var(--orange)', color:'#fff', borderRadius:'20px', padding:'2px 10px', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
                {cart.reduce((a, i) => a + i.quantity, 0)}
              </span>
            )}
          </div>
          <button onClick={closeDrawer} style={{ flexShrink:0, background:'var(--card)', border:'1px solid var(--border)', borderRadius:'8px', padding:'7px 12px', color:'var(--text2)', cursor:'pointer', fontSize:'13px', fontFamily:'Inter,sans-serif' }}>✕</button>
        </div>

        {/* Loading shimmer */}
        {loading && <div style={{ flexShrink:0, padding:'14px 20px', color:'var(--text3)', fontSize:'14px', textAlign:'center' }}>Loading cart…</div>}

        {/* ═══════════════════════════════════════════════════════════════
            SUCCESS
        ═══════════════════════════════════════════════════════════════ */}
        {step === STEP_SUCCESS && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', textAlign:'center', overflowY:'auto' }}>
            <div style={{ fontSize:'64px', marginBottom:'14px' }}>🎉</div>
            <h3 style={{ fontWeight:900, fontSize:'21px', marginBottom:'8px', background:'linear-gradient(135deg,#f97316,#ea580c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Order Placed!</h3>
            <p style={{ color:'var(--text2)', marginBottom:'14px', fontSize:'14px' }}>Your order is heading to the kitchen!</p>
            <div style={{ padding:'12px 28px', background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.3)', borderRadius:'12px', fontWeight:800, fontSize:'20px', color:'var(--orange-light)', letterSpacing:'2px' }}>
              #{orderNum}
            </div>
            <button onClick={() => { closeDrawer(); navigate('/track-orders'); }} style={{ marginTop:'18px', padding:'10px 24px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', borderRadius:'10px', color:'#fff', fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
              🚚 Track My Order
            </button>
            <p style={{ color:'var(--text3)', fontSize:'11px', marginTop:'10px' }}>Closes automatically in 5 s…</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            CART
        ═══════════════════════════════════════════════════════════════ */}
        {step === STEP_CART && !loading && (
          <>
            {/* Scrollable items list */}
            <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'14px 18px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign:'center', paddingTop:'50px' }}>
                  <div style={{ fontSize:'64px', marginBottom:'14px' }}>🛒</div>
                  <h3 style={{ fontWeight:700, fontSize:'17px', marginBottom:'8px' }}>Your cart is empty</h3>
                  <p style={{ color:'var(--text2)', fontSize:'14px' }}>Add items from the menu below!</p>
                  <button
                    onClick={() => {
                      closeDrawer();
                      const el = document.getElementById('menu');
                      if (el) el.scrollIntoView({ behavior:'smooth' });
                      else { navigate('/'); setTimeout(() => document.getElementById('menu')?.scrollIntoView({ behavior:'smooth' }), 400); }
                    }}
                    style={{ marginTop:'18px', padding:'10px 22px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', borderRadius:'10px', color:'#fff', fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:'14px', cursor:'pointer' }}
                  >Browse Menu</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {cart.map(item => (
                    <div key={item._id} style={{ display:'flex', gap:'12px', padding:'12px', background:'var(--bg2)', borderRadius:'12px', border:'1px solid var(--border)', alignItems:'center' }}>
                      <div style={{ width:'46px', height:'46px', borderRadius:'10px', overflow:'hidden', flexShrink:0, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px' }}>
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.currentTarget.style.display='none'; }} />
                          : (item.emoji || '🍽️')}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'14px', textTransform:'capitalize', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                        <div style={{ color:'var(--orange-light)', fontWeight:700, fontSize:'13px' }}>Rs {item.price * item.quantity}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                        <button onClick={() => updateQty(item._id, item.quantity - 1)} style={{ width:'26px', height:'26px', borderRadius:'7px', border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontSize:'15px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                        <span style={{ fontWeight:700, fontSize:'14px', minWidth:'18px', textAlign:'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item._id, item.quantity + 1)} style={{ width:'26px', height:'26px', borderRadius:'7px', border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontSize:'15px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        <button onClick={() => removeFromCart(item._id)} style={{ width:'26px', height:'26px', borderRadius:'7px', border:'none', background:'rgba(239,68,68,0.1)', color:'#ef4444', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fixed bottom actions */}
            {cart.length > 0 && (
              <div style={{ flexShrink:0, padding:'16px 18px', borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px' }}>
                  <span style={{ color:'var(--text2)', fontSize:'15px' }}>Total</span>
                  <span style={{ fontWeight:900, fontSize:'21px', color:'var(--orange-light)' }}>Rs {cartTotal}</span>
                </div>
                <button
                  onClick={() => {
                    if (!isLoggedIn) { alert('Please sign in to place an order.'); return; }
                    setAddress(a => ({ ...a, phone: a.phone || user?.phone || '' }));
                    setStep(STEP_CHECKOUT);
                  }}
                  style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', borderRadius:'12px', color:'#fff', fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'15px', cursor:'pointer', marginBottom:'9px' }}
                >
                  🛍️ Proceed to Checkout →
                </button>
                <button onClick={clearCart} style={{ width:'100%', padding:'10px', background:'transparent', border:'1px solid var(--border)', borderRadius:'12px', color:'var(--text2)', fontFamily:'Inter,sans-serif', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
                  Clear Cart
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            CHECKOUT  — Delivery Address + Payment Method
            KEY FIX: flex:1 + minHeight:0 on outer + overflowY:auto on inner
        ═══════════════════════════════════════════════════════════════ */}
        {step === STEP_CHECKOUT && (
          <>
            {/* Scrollable form area */}
            <div style={{ flex:1, minHeight:0, overflowY:'auto', overflowX:'hidden', padding:'16px 18px', display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* Delivery Address card */}
              <div style={{ background:'var(--bg2)', borderRadius:'14px', padding:'14px 16px', border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:800, fontSize:'13px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'7px' }}>
                  <span>📍</span> Delivery Address
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  <div>
                    <label style={lbl}>Street / Area *</label>
                    <input style={inp(errors.street)} placeholder="e.g. 12-B, Gulshan Block 7" value={address.street}
                      onChange={e => { setAddress(a => ({ ...a, street: e.target.value })); setErrors(er => ({ ...er, street:'' })); }} />
                    {errors.street && <p style={err}>{errors.street}</p>}
                  </div>
                  <div>
                    <label style={lbl}>City *</label>
                    <input style={inp(errors.city)} placeholder="e.g. Karachi" value={address.city}
                      onChange={e => { setAddress(a => ({ ...a, city: e.target.value })); setErrors(er => ({ ...er, city:'' })); }} />
                    {errors.city && <p style={err}>{errors.city}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Phone Number *</label>
                    <input style={inp(errors.phone)} placeholder="e.g. 03001234567" value={address.phone}
                      onChange={e => { setAddress(a => ({ ...a, phone: e.target.value })); setErrors(er => ({ ...er, phone:'' })); }} />
                    {errors.phone && <p style={err}>{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Payment Method card */}
              <div style={{ background:'var(--bg2)', borderRadius:'14px', padding:'14px 16px', border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:800, fontSize:'13px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'7px' }}>
                  <span>💳</span> Payment Method
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'10px', cursor:'pointer', border:`1.5px solid ${payment===opt.id?'var(--orange)':'var(--border)'}`, background:payment===opt.id?'rgba(249,115,22,0.07)':'transparent', transition:'all 0.2s' }}>
                      <input type="radio" name="payment" value={opt.id} checked={payment===opt.id} onChange={() => setPayment(opt.id)} style={{ accentColor:'var(--orange)', width:'15px', height:'15px', flexShrink:0 }} />
                      <div>
                        <div style={{ fontWeight:700, fontSize:'13px' }}>{opt.label}</div>
                        <div style={{ fontSize:'11px', color:'var(--text3)' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label style={lbl}>Special Instructions (optional)</label>
                <textarea
                  style={{ ...inp(false), minHeight:'65px', resize:'none' }}
                  placeholder="e.g. Extra spicy, no onions, ring the bell…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              {/* Spacer so last field isn't hidden behind fixed buttons on tiny screens */}
              <div style={{ height:'4px' }} />
            </div>

            {/* Fixed bottom buttons */}
            <div style={{ flexShrink:0, padding:'14px 18px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:'9px', background:'var(--bg3)' }}>
              <button
                onClick={() => { if (validate()) setStep(STEP_CONFIRM); }}
                style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', borderRadius:'12px', color:'#fff', fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'15px', cursor:'pointer' }}
              >
                Review Order →
              </button>
              <button onClick={() => setStep(STEP_CART)} style={{ width:'100%', padding:'10px', background:'transparent', border:'1px solid var(--border)', borderRadius:'12px', color:'var(--text2)', fontFamily:'Inter,sans-serif', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
                ← Back to Cart
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            CONFIRM — Order summary before final submit
        ═══════════════════════════════════════════════════════════════ */}
        {step === STEP_CONFIRM && (
          <>
            {/* Scrollable summary */}
            <div style={{ flex:1, minHeight:0, overflowY:'auto', overflowX:'hidden', padding:'16px 18px', display:'flex', flexDirection:'column', gap:'14px' }}>

              {/* Items */}
              <div style={{ background:'var(--bg2)', borderRadius:'14px', padding:'14px 16px', border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:800, fontSize:'13px', marginBottom:'12px' }}>🧾 Order Summary</div>
                {cart.map(item => (
                  <div key={item._id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:'13px' }}>
                    <span style={{ textTransform:'capitalize', fontWeight:600 }}>{item.quantity} × {item.name}</span>
                    <span style={{ color:'var(--orange-light)', fontWeight:700 }}>Rs {item.price * item.quantity}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'11px', fontWeight:900, fontSize:'17px' }}>
                  <span>Total</span>
                  <span style={{ color:'var(--orange-light)' }}>Rs {cartTotal}</span>
                </div>
              </div>

              {/* Delivery details */}
              <div style={{ background:'var(--bg2)', borderRadius:'14px', padding:'14px 16px', border:'1px solid var(--border)', fontSize:'13px' }}>
                <div style={{ fontWeight:800, fontSize:'13px', marginBottom:'10px' }}>📍 Delivery Details</div>
                <div style={{ color:'var(--text2)', lineHeight:1.8 }}>
                  <div>📌 {address.street}, {address.city}</div>
                  <div>📞 {address.phone}</div>
                  <div style={{ marginTop:'5px', fontWeight:700, color:'var(--text)' }}>
                    {PAYMENT_OPTIONS.find(o => o.id === payment)?.label}
                  </div>
                  {note && <div style={{ marginTop:'5px', color:'var(--text3)', fontStyle:'italic' }}>📝 "{note}"</div>}
                </div>
              </div>
            </div>

            {/* Fixed bottom buttons */}
            <div style={{ flexShrink:0, padding:'14px 18px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:'9px', background:'var(--bg3)' }}>
              <button onClick={submitOrder} disabled={placing} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', borderRadius:'12px', color:'#fff', fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:'15px', cursor:'pointer', opacity:placing?0.7:1 }}>
                {placing ? '⏳ Placing Order…' : '✅ Place Order Now'}
              </button>
              <button onClick={() => setStep(STEP_CHECKOUT)} style={{ width:'100%', padding:'10px', background:'transparent', border:'1px solid var(--border)', borderRadius:'12px', color:'var(--text2)', fontFamily:'Inter,sans-serif', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
                ← Edit Details
              </button>
            </div>
          </>
        )}

      </div>
    </>
  );
};

export default CartDrawer;

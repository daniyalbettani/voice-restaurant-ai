import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const BOT_INTRO = {
  role: 'bot',
  text: "👋 Hi! I'm VoiceBite's AI assistant. Tell me what you'd like to order and I'll take care of it! 🍽️",
};

const STATUS_BADGE = {
  pending:   { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
  preparing: { bg: '#dbeafe', color: '#2563eb', label: 'Preparing' },
  ready:     { bg: '#ede9fe', color: '#7c3aed', label: 'Ready' },
  done:      { bg: '#dcfce7', color: '#16a34a', label: 'Done ✓' },
  cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
};

// ── Phrase detection helpers ──────────────────────────────────────────────────
const DECLINE_PHRASES = [
  'no thanks','no thank you','nope','no','nothing','that\'s all','that\'s it','thats all',
  'thats it','that is all','that is it','nothing else','i\'m good','im good',
  'i\'m done','im done','all done','done','cancel','never mind','nevermind','stop',
  'not now','not today','no more','finish','finished','end','close','bye','goodbye',
];
const CONFIRM_PHRASES = [
  'yes','yeah','yep','sure','ok','okay','confirm','place order','place it',
  'place my order','go ahead','do it','yes please','order it','book it','yes confirm',
];

const matchesPhrase = (text, phrases) => {
  const lower = text.toLowerCase().trim().replace(/[!.,?]+$/, '');
  return phrases.some(p => lower === p || lower.startsWith(p + ' '));
};

// ─────────────────────────────────────────────────────────────────────────────
const ChatBot = () => {
  const [open,         setOpen]         = useState(false);
  const [input,        setInput]        = useState('');
  const [messages,     setMessages]     = useState([BOT_INTRO]);
  const [loading,      setLoading]      = useState(false);
  const [menu,         setMenu]         = useState([]);
  const [pendingOrder, setPendingOrder] = useState(null);

  const { user, isLoggedIn } = useAuth();
  const { addToCart }        = useCart();
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  // Keep a ref so callbacks always see the freshest pendingOrder
  const pendingRef = useRef(null);
  pendingRef.current = pendingOrder;

  // Load menu once
  useEffect(() => {
    fetch(`${API}/api/menu`)
      .then(r => r.json())
      .then(d => setMenu(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const pushMsg = (role, text, extra = {}) =>
    setMessages(prev => [...prev, { role, text, ...extra }]);

  // ── Confirm order ──────────────────────────────────────────────────────────
  const confirmOrder = useCallback(async () => {
    const items = pendingRef.current;
    if (!items || items.length === 0) {
      pushMsg('bot', "⚠️ No pending order to confirm. Please tell me what you'd like to order first!");
      return;
    }
    if (!isLoggedIn) {
      pushMsg('bot', '🔐 Please sign in first to place an order. Click **Sign In** in the top-right corner.');
      setPendingOrder(null);
      return;
    }
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    try {
      const res = await fetch(`${API}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          total,
          userId: user._id || user.id,
          source: 'chat',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        pushMsg('bot',
          `✅ Order placed! Your order **#${data.order._id.slice(-6).toUpperCase()}** is confirmed and the kitchen is on it! 🍳\n\nYou can track it from the **Track Orders** link in the menu.`
        );
        setPendingOrder(null);
        items.forEach(item => {
          const menuItem = menu.find(m => m.name.toLowerCase() === item.name.toLowerCase());
          if (menuItem) addToCart(menuItem);
        });
      } else {
        pushMsg('bot', `⚠️ ${data.message || 'Could not place the order. Please try again.'}`);
      }
    } catch {
      pushMsg('bot', '⚠️ Connection error. Make sure the server is running and try again.');
    }
  }, [isLoggedIn, user, menu, addToCart]);

  // ── Cancel pending order ───────────────────────────────────────────────────
  const cancelOrder = useCallback(() => {
    setPendingOrder(null);
    pushMsg('bot', "No problem! Order cancelled. Would you like to try something else? 😊");
  }, []);

  // ── Main send handler ──────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    pushMsg('user', text);
    setLoading(true);

    try {
      // ── 1. Client-side: decline / "no thanks" ─────────────────────────────
      if (matchesPhrase(text, DECLINE_PHRASES)) {
        if (pendingRef.current && pendingRef.current.length > 0) {
          // They declined after seeing order summary → cancel it
          setPendingOrder(null);
          pushMsg('bot', "Got it! I've cancelled that order. Feel free to start a new one anytime! 😊");
        } else {
          pushMsg('bot', "Alright! No worries. Come back anytime you're hungry! 🍽️");
        }
        setLoading(false);
        return;
      }

      // ── 2. Client-side: confirm / "yes" ───────────────────────────────────
      if (matchesPhrase(text, CONFIRM_PHRASES) && pendingRef.current?.length > 0) {
        setLoading(false);
        await confirmOrder();
        return;
      }

      // ── 3. Send to AI ──────────────────────────────────────────────────────
      const res  = await fetch(`${API}/api/voice-parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, menu }),
      });
      const data = await res.json();

      if (data.intent === 'order' && data.items?.length > 0) {
        const items = data.items;
        const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
        pushMsg('bot', data.message || "Here's your order summary:");
        setPendingOrder(items);
        pushMsg('bot', '', { isOrderSummary: true, items, total });
        pushMsg('bot', 'Would you like to confirm this order? Type **yes** to place it, or **no** to cancel. 👆');
      } else if (data.intent === 'no_ai') {
        pushMsg('bot', "🤔 I'm having trouble understanding right now. Please try rephrasing, or type items like: \"1 burger and 2 cokes\".");
      } else {
        const msg = data.message || "I didn't quite catch that. Could you rephrase your order?";
        pushMsg('bot', msg);
      }
    } catch {
      pushMsg('bot', '⚠️ Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        id="chatbot-toggle"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 300,
          width: '58px', height: '58px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#f97316,#ea580c)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(249,115,22,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px', transition: 'transform 0.2s',
        }}
        title="Chat with VoiceBite AI"
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '96px', right: '24px', zIndex: 300,
          width: '360px', maxHeight: '540px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '18px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', background: 'linear-gradient(135deg,#f97316,#ea580c)',
            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
          }}>
            <span style={{ fontSize: '22px' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#fff' }}>VoiceBite AI Assistant</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>● Online • Replies instantly</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginLeft: 'auto', background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '8px', color: '#fff',
                fontSize: '14px', cursor: 'pointer', padding: '4px 9px', fontWeight: 700,
              }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.isOrderSummary ? (
                  <div style={{
                    background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
                    borderRadius: '12px', padding: '14px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--orange-light)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      📦 Order Summary
                    </div>
                    {msg.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', color: 'var(--text2)', borderBottom: j < msg.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ textTransform: 'capitalize' }}>{item.quantity}× {item.name}</span>
                        <span>Rs {item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(249,115,22,0.2)', fontWeight: 800, color: 'var(--orange-light)' }}>
                      <span>Total</span><span>Rs {msg.total}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={confirmOrder}
                        style={{
                          flex: 1, padding: '9px', background: 'linear-gradient(135deg,#f97316,#ea580c)',
                          border: 'none', borderRadius: '8px', color: '#fff',
                          fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        ✅ Confirm & Place Order
                      </button>
                      <button
                        onClick={cancelOrder}
                        style={{
                          flex: 1, padding: '9px', background: 'transparent',
                          border: '1px solid var(--border)', borderRadius: '8px',
                          color: 'var(--text2)', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    maxWidth: '82%', padding: '10px 13px', borderRadius: '14px',
                    fontSize: '13px', lineHeight: '1.55',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginLeft: msg.role === 'user' ? 'auto' : '0',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg,#f97316,#ea580c)'
                      : 'var(--bg2)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    border: msg.role === 'bot' ? '1px solid var(--border)' : 'none',
                    wordBreak: 'break-word',
                  }}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '4px', padding: '10px 13px', background: 'var(--bg2)', borderRadius: '14px', width: 'fit-content', border: '1px solid var(--border)' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--orange)', display: 'inline-block', animation: `bounce 1s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="e.g. 2 burgers and 1 coke…"
              style={{
                flex: 1, padding: '10px 13px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: '10px',
                color: 'var(--text)', fontFamily: 'Inter,sans-serif', fontSize: '13px', outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 14px', background: 'linear-gradient(135deg,#f97316,#ea580c)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: '14px',
                cursor: 'pointer', opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); }
          40%          { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
};

export default ChatBot;

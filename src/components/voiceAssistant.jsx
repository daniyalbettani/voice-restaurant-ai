import { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseOrder, generateResponse } from '../services/orderParser';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const LANGUAGES = [
  { code: 'en-US', flag: '🇺🇸', label: 'English' },
  { code: 'en-IN', flag: '🇵🇰', label: 'Eng (Accent)' },
  { code: 'ur-PK', flag: '🇵🇰', label: 'اردو Urdu' },
  { code: 'hi-IN', flag: '🇮🇳', label: 'हिंदी / Hinglish' },
];

const VoiceAssistant = () => {
  const [cart,        setCart]        = useState([]);
  const [menu,        setMenu]        = useState([]);
  const [transcript,  setTranscript]  = useState('');
  const [responseMsg, setResponseMsg] = useState('');
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [processing,  setProcessing]  = useState(false);
  const [lang,        setLang]        = useState('en-IN');
  const menuRef = useRef([]);

  useEffect(() => {
    fetch(`${API}/api/menu`)
      .then(r => r.json())
      .then(d => { setMenu(d); menuRef.current = d; })
      .catch(console.error)
      .finally(() => setLoadingMenu(false));
  }, []);

  const saveOrder = async (orderData) => {
    try {
      await fetch(`${API}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
    } catch (err) { console.error(err); }
  };

  const handleSpeechResult = async (text) => {
    if (text === '__no_speech__') {
      const msg = "I didn't hear anything. Tap the mic again and speak clearly. 🎤";
      setResponseMsg(msg); speak(msg); return;
    }

    setTranscript(text);
    setProcessing(true);

    try {
      // ── Try Gemini backend first ─────────────────────────────────────────
      let aiHandled = false;
      try {
        const res  = await fetch(`${API}/api/voice-parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text, menu: menuRef.current }),
          signal: AbortSignal.timeout(8000), // 8s timeout
        });
        const data = await res.json();

        if (res.ok && data.intent && data.intent !== 'error' && data.intent !== 'no_ai') {
          const msg = data.message || "Got it!";
          setResponseMsg(msg); speak(msg);
          if (data.intent === 'order' && data.items?.length > 0) {
            saveOrder({ items: data.items, total: data.total });
            setCart(data.items);
          }
          aiHandled = true;
        }
      } catch { /* Gemini unavailable — fall through to local parser */ }

      // ── Local multilingual parser fallback ───────────────────────────────
      if (!aiHandled) {
        const result = parseOrder(text, menuRef.current);
        const msg    = generateResponse(result, menuRef.current);
        setResponseMsg(msg);
        speak(msg);
        if (result.intent === 'order' && result.order.length > 0) {
          saveOrder({ items: result.order, total: result.total });
          setCart(result.order);
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const { listening, startListening, speak } = useSpeechRecognition(handleSpeechResult, lang);
  const cartTotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const isBusy = loadingMenu || listening || processing;

  return (
    <section className="section voice-section" id="voice">
      <div className="section-header">
        <h2>🎤 <span className="gradient-text">Voice Order</span></h2>
        <p>Speak in any language — Urdu, Hindi, English or Hinglish</p>
      </div>

      <div className="voice-container">

        {/* Language selector */}
        <div style={{ display:'flex', justifyContent:'center', gap:'8px', flexWrap:'wrap', marginBottom:'20px' }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)} style={{
              padding:'7px 14px', borderRadius:'30px', fontSize:'13px', fontWeight:600,
              fontFamily:'Inter,sans-serif', cursor:'pointer', transition:'all 0.2s',
              border: lang===l.code ? '1px solid var(--orange)' : '1px solid var(--border)',
              background: lang===l.code ? 'rgba(249,115,22,0.12)' : 'var(--card)',
              color: lang===l.code ? 'var(--orange-light)' : 'var(--text2)',
            }}>{l.flag} {l.label}</button>
          ))}
        </div>

        {/* Hint per language */}
        <p style={{ color:'var(--text3)', fontSize:'12px', marginBottom:'20px', textAlign:'center' }}>
          {lang==='ur-PK'
            ? '🇵🇰 مثلاً: "مجھے دو پیزا اور ایک برگر چاہیے" یا "برگر لاؤ"'
            : lang==='en-IN'
            ? '🇵🇰 e.g. "mujhe ek pizza dena" or "do burger chahiye" or "give me two burgers"'
            : lang==='hi-IN'
            ? '🇮🇳 e.g. "mujhe do burger aur ek pizza chahiye" or "biryani lao"'
            : '🇺🇸 e.g. "I want two pizzas and one burger please"'}
        </p>

        {/* Mic button */}
        <div className="voice-btn-wrap">
          <button
            className={`voice-btn ${processing ? 'loading' : listening ? 'listening' : 'idle'}`}
            onClick={() => { if (!isBusy) startListening(); }}
            title={processing ? 'Processing…' : listening ? 'Listening…' : 'Click to speak'}
          >
            {processing ? '🤖' : listening ? '🔴' : loadingMenu ? '⏳' : '🎤'}
          </button>
        </div>

        <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'8px', textAlign:'center' }}>
          {processing ? '🤖 Understanding your order…'
           : listening ? '🎙️ Listening… speak now'
           : loadingMenu ? 'Loading menu…'
           : 'Tap mic and speak your order'}
        </p>

        {/* Waveform */}
        {listening && (
          <div className="waveform">
            {[...Array(7)].map((_, i) => <div key={i} className="waveform-bar" />)}
          </div>
        )}

        {/* You said */}
        {transcript && transcript !== '__no_speech__' && (
          <div className="chat-bubble bubble-user" style={{ marginTop:'32px' }}>
            <div className="bubble-label">You said</div>
            <div className="bubble-text">"{transcript}"</div>
          </div>
        )}

        {/* AI response */}
        {responseMsg && (
          <div className="chat-bubble bubble-ai">
            <div className="bubble-label">🤖 AI Waiter</div>
            <div className="bubble-text">{responseMsg}</div>
          </div>
        )}

        {/* Cart */}
        {cart.length > 0 && (
          <div className="glass cart-card">
            <div className="cart-title">🛒 Your Voice Order</div>
            {cart.map((item, i) => (
              <div key={i} className="cart-item">
                <span>{item.quantity} × <span style={{textTransform:'capitalize'}}>{item.name}</span></span>
                <span style={{color:'var(--orange-light)',fontWeight:600}}>Rs {item.price*item.quantity}</span>
              </div>
            ))}
            <div className="cart-total">
              <span>Total</span>
              <span className="cart-total-price">Rs {cartTotal}</span>
            </div>
            <button className="btn btn-primary"
              style={{width:'100%',justifyContent:'center',marginTop:'20px'}}
              onClick={() => { setCart([]); setTranscript(''); setResponseMsg(''); }}>
              ✓ Clear & New Order
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default VoiceAssistant;

import { useState, useEffect, useRef } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { parseOrder, generateResponse } from "../services/orderParser";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

// Only 2 languages supported: Roman Urdu / Eng & US English
const LANGUAGES = [
  { code: "en-IN", flag: "🇵🇰", label: "Roman Urdu / Eng" },
  { code: "en-US", flag: "🇺🇸", label: "US English" },
];

const VoiceAssistant = () => {
  const [cart, setCart] = useState([]);
  const [menu, setMenu] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [responseMsg, setResponseMsg] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const [orderNum, setOrderNum] = useState("");
  const menuRef = useRef([]);

  const { user, isLoggedIn } = useAuth();
  const { setAuthRequired } = useCart();

  useEffect(() => {
    fetch(`${API}/api/menu`)
      .then((r) => r.json())
      .then((d) => {
        setMenu(Array.isArray(d) ? d : []);
        menuRef.current = Array.isArray(d) ? d : [];
      })
      .catch(console.error)
      .finally(() => setLoadingMenu(false));
  }, []);

  const handleSpeechResult = async (text) => {
    if (text === "__no_speech__") {
      const msg =
        "I didn't hear anything. Tap the mic again and speak clearly. 🎤";
      setResponseMsg(msg);
      speak(msg);
      return;
    }

    setTranscript(text);
    setProcessing(true);

    try {
      let newlyParsedItems = [];
      let aiMessage = "";

      // ── Try Gemini backend parser ─────────────────────────────────────────────
      let aiHandled = false;
      try {
        const res = await fetch(`${API}/api/voice-parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text, menu: menuRef.current }),
          signal: AbortSignal.timeout(8000),
        });
        const data = await res.json();

        if (
          res.ok &&
          data.intent &&
          data.intent !== "error" &&
          data.intent !== "no_ai"
        ) {
          aiMessage = data.message || "Got it!";
          if (data.intent === "order" && data.items?.length > 0) {
            newlyParsedItems = data.items;
          }
          aiHandled = true;
        }
      } catch {
        /* Fall back to offline parser if backend is unreachable */
      }

      // ── Local offline parser fallback ─────────────────────────────────────────
      if (!aiHandled) {
        const result = parseOrder(text, menuRef.current);
        aiMessage = generateResponse(result, menuRef.current);
        if (result.intent === "order" && result.order.length > 0) {
          newlyParsedItems = result.order;
        }
      }

      // Merge newly parsed items into active voice cart
      if (newlyParsedItems.length > 0) {
        setCart((prev) => {
          const merged = [...prev];
          newlyParsedItems.forEach((newItem) => {
            const idx = merged.findIndex(
              (i) => i.name.toLowerCase() === newItem.name.toLowerCase(),
            );
            if (idx > -1) {
              merged[idx].quantity += newItem.quantity;
            } else {
              merged.push(newItem);
            }
          });
          return merged;
        });

        const followUp =
          "\n\nWould you like anything else? Say it now, or click 'Confirm & Proceed' below! 😊";
        setResponseMsg(aiMessage + followUp);
        speak(aiMessage + " Would you like anything else?");
      } else {
        setResponseMsg(aiMessage);
        speak(aiMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const { listening, startListening, speak } = useSpeechRecognition(
    handleSpeechResult,
    lang,
  );
  const cartTotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const isBusy = loadingMenu || listening || processing;

  const handleMicClick = () => {
    if (!isLoggedIn) {
      const msg = "🔒 Please sign in first to place voice orders.";
      setResponseMsg(msg);
      speak(msg);
      setAuthRequired(true);
      return;
    }
    if (!isBusy) startListening();
  };

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total: cartTotal,
          userId: user?._id || user?.id,
          source: "voice",
        }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        const idStr = data.order._id
          ? data.order._id.slice(-6).toUpperCase()
          : "OK";
        setOrderNum(idStr);
        const successMsg = `🎉 Order placed successfully! Your order number is #${idStr}. We are preparing your food!`;
        setResponseMsg(successMsg);
        speak("Order placed successfully! Enjoy your meal.");
        setCart([]);
      } else {
        setResponseMsg("⚠️ Couldn't place the order. Please try again.");
      }
    } catch {
      setResponseMsg("⚠️ Error connecting to server while placing order.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelOrder = () => {
    setCart([]);
    setTranscript("");
    setOrderNum("");
    const cancelMsg =
      "No problem! Your voice order has been cancelled. Let me know if you want to start a new one. 😊";
    setResponseMsg(cancelMsg);
    speak("Your order has been cancelled.");
  };

  return (
    <section className="section voice-section" id="voice">
      <div className="section-header">
        <h2>
          🎤 <span className="gradient-text">Voice Order</span>
        </h2>
        <p>Speak in Roman Urdu, Hinglish or English</p>
      </div>

      <div className="voice-container">
        {/* 2 Language options only */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              style={{
                padding: "8px 18px",
                borderRadius: "30px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "Inter,sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
                border:
                  lang === l.code
                    ? "1px solid var(--orange)"
                    : "1px solid var(--border)",
                background:
                  lang === l.code ? "rgba(249,115,22,0.12)" : "var(--card)",
                color: lang === l.code ? "var(--orange-light)" : "var(--text2)",
              }}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        {/* Hint text */}
        <p
          style={{
            color: "var(--text3)",
            fontSize: "12px",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          {lang === "en-IN"
            ? '🇵🇰 e.g. "mujhe 2 burger aur 3 pizza chahiye" or "1 biryani and 2 coke"'
            : '🇺🇸 e.g. "I want two burgers and three pizzas please"'}
        </p>

        {/* Mic button */}
        <div className="voice-btn-wrap">
          <button
            className={`voice-btn ${processing ? "loading" : listening ? "listening" : "idle"}`}
            onClick={handleMicClick}
            title={
              processing
                ? "Processing…"
                : listening
                  ? "Listening…"
                  : "Click to speak"
            }
          >
            {processing ? "🤖" : listening ? "🔴" : loadingMenu ? "⏳" : "🎤"}
          </button>
        </div>

        <p
          style={{
            color: "var(--text2)",
            fontSize: "14px",
            marginBottom: "8px",
            textAlign: "center",
          }}
        >
          {processing
            ? "🤖 Understanding your order…"
            : listening
              ? "🎙️ Listening… speak now"
              : loadingMenu
                ? "Loading menu…"
                : "Tap mic and speak your order"}
        </p>

        {/* Waveform */}
        {listening && (
          <div className="waveform">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="waveform-bar" />
            ))}
          </div>
        )}

        {/* Transcript display */}
        {transcript && transcript !== "__no_speech__" && (
          <div
            className="chat-bubble bubble-user"
            style={{ marginTop: "32px" }}
          >
            <div className="bubble-label">You said</div>
            <div className="bubble-text">"{transcript}"</div>
          </div>
        )}

        {/* AI response */}
        {responseMsg && (
          <div className="chat-bubble bubble-ai">
            <div className="bubble-label">🤖 AI Waiter</div>
            <div className="bubble-text" style={{ whiteSpace: "pre-line" }}>
              {responseMsg}
            </div>
          </div>
        )}

        {/* Voice Cart Confirmation */}
        {cart.length > 0 && (
          <div
            className="glass cart-card"
            style={{ marginTop: "24px", padding: "20px", borderRadius: "16px" }}
          >
            <div
              className="cart-title"
              style={{
                fontSize: "18px",
                fontWeight: 800,
                marginBottom: "14px",
                color: "var(--orange-light)",
              }}
            >
              📦 Order Details (Please Confirm)
            </div>
            {cart.map((item, i) => (
              <div
                key={i}
                className="cart-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ textTransform: "capitalize", fontWeight: 600 }}>
                  {item.quantity} × {item.name}
                </span>
                <span style={{ fontWeight: 700 }}>
                  Rs {item.price * item.quantity}
                </span>
              </div>
            ))}
            <div
              className="cart-total"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 0",
                fontWeight: 900,
                fontSize: "18px",
              }}
            >
              <span>Total</span>
              <span
                className="cart-total-price"
                style={{ color: "var(--orange-light)" }}
              >
                Rs {cartTotal}
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center", padding: "12px" }}
                onClick={handleConfirmOrder}
              >
                ✅ Confirm & Proceed
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  padding: "12px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text2)",
                }}
                onClick={handleCancelOrder}
              >
                ❌ Cancel Order
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default VoiceAssistant;

import { useState, useRef } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
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
  const [transcript, setTranscript] = useState("");
  const [responseMsg, setResponseMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lang, setLang] = useState("en-IN");
  const [orderNum, setOrderNum] = useState("");

  const { user, isLoggedIn } = useAuth();
  const { setAuthRequired, refreshCart, setCartOpen } = useCart();

  // Get stored JWT token (same key used by CartContext)
  const getToken = () => {
    try {
      const t = localStorage.getItem("vb_token");
      return t && t !== "null" && t !== "undefined" ? t : null;
    } catch { return null; }
  };

  const handleSpeechResult = async (text) => {
    if (text === "__no_speech__") {
      const msg = "I didn't hear anything. Tap the mic again and speak clearly. 🎤";
      setResponseMsg(msg);
      speak(msg);
      return;
    }

    setTranscript(text);
    setProcessing(true);

    try {
      const token = getToken();
      if (!token) {
        const msg = "🔒 Please sign in first to use voice ordering.";
        setResponseMsg(msg);
        speak(msg);
        setAuthRequired(true);
        return;
      }

      // ── Call the new Gemini-powered backend endpoint ─────────────────────
      const res = await fetch(`${API}/api/ai/process-voice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transcript: text }),
        signal: AbortSignal.timeout(12000),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg =
          data?.message ||
          "⚠️ Something went wrong. Please try again.";
        setResponseMsg(errMsg);
        speak(errMsg);
        return;
      }

      // ApiResponse wrapper: data.data = { actionTaken, voiceResponse, cart, order }
      const result = data?.data || data;
      const voiceResponse = result?.voiceResponse || "Got it!";
      const actionTaken = result?.actionTaken || "GENERAL_QUERY";

      setResponseMsg(voiceResponse);
      speak(voiceResponse);

      // ── Sync CartContext after any cart-mutating intent ──────────────────
      if (["ADD_TO_CART", "REORDER_LAST_MEAL", "PLACE_ORDER"].includes(actionTaken)) {
        await refreshCart();
      }

      // ── If order was placed via voice, show order number ─────────────────
      if (actionTaken === "PLACE_ORDER" && result?.order?._id) {
        const idStr = result.order._id.toString().slice(-6).toUpperCase();
        setOrderNum(idStr);
      } else {
        setOrderNum("");
      }
    } catch (err) {
      const msg =
        err?.name === "TimeoutError"
          ? "⏱️ Request timed out. Please try again."
          : "⚠️ Error connecting to server.";
      setResponseMsg(msg);
      speak(msg);
    } finally {
      setProcessing(false);
    }
  };

  const { listening, startListening, speak } = useSpeechRecognition(
    handleSpeechResult,
    lang,
  );

  const isBusy = listening || processing;

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

  const handleViewCart = () => {
    setCartOpen(true);
  };

  const handleReset = () => {
    setTranscript("");
    setResponseMsg("");
    setOrderNum("");
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
        {/* Language selector */}
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
            {processing ? "🤖" : listening ? "🔴" : "🎤"}
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

        {/* Order placed confirmation */}
        {orderNum && (
          <div
            className="glass"
            style={{
              marginTop: "24px",
              padding: "20px",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "10px" }}>🎉</div>
            <div
              style={{
                fontWeight: 900,
                fontSize: "18px",
                marginBottom: "6px",
                color: "var(--orange-light)",
              }}
            >
              Voice Order Placed!
            </div>
            <div
              style={{
                padding: "8px 20px",
                background: "rgba(249,115,22,0.1)",
                border: "1px solid rgba(249,115,22,0.3)",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "16px",
                color: "var(--orange-light)",
                letterSpacing: "2px",
                display: "inline-block",
              }}
            >
              #{orderNum}
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: "16px", width: "100%" }}
              onClick={handleReset}
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* Quick actions after AI responds */}
        {responseMsg && !orderNum && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "20px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-primary"
              style={{ padding: "10px 20px" }}
              onClick={handleViewCart}
            >
              🛒 View Cart
            </button>
            <button
              className="btn btn-secondary"
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text2)",
              }}
              onClick={handleReset}
            >
              🔄 Reset
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default VoiceAssistant;

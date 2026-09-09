import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Dynamically resolves API URL matching current hostname (localhost or 192.168.x.x)
const API =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Access current customer session context
  const { user, isLoggedIn, logout } = useAuth();

  // Check if a customer session is currently active
  const isCustomerLoggedIn =
    isLoggedIn && (!user?.role || user?.role === "customer");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // 🔒 GUARD: Prevent admin login if customer is logged in
    if (isCustomerLoggedIn) {
      setError(
        "⛔ You are currently logged in as a customer. Please log out of your customer account first.",
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setError("Server returned an invalid response. Check backend logs.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data?.message || "Login failed.");
        setLoading(false);
        return;
      }

      const role = data?.user?.role;
      if (!role || !["staff", "sub_admin", "super_admin"].includes(role)) {
        setError(
          "⛔ Access denied. You don't have administrative permissions. Contact the owner.",
        );
        setLoading(false);
        return;
      }

      const adminData = {
        id: data.user.id || data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
      };

      // 1. Save credentials to admin-specific storage
      localStorage.setItem("vb_admin_token", data.token);
      localStorage.setItem("vb_admin_user", JSON.stringify(adminData));

      // 2. Synchronize credentials to main website storage for Home/Navbar awareness
      localStorage.setItem("vb_token", data.token);
      localStorage.setItem("vb_user", JSON.stringify(adminData));

      // 3. Notify AuthContext to update session state immediately
      window.dispatchEvent(new Event("vb_auth_change"));
      window.dispatchEvent(new Event("vb_user_change"));

      // Navigate to admin panel
      navigate("/admin");
    } catch (err) {
      console.error("Admin login error:", err);
      setError(
        `Connection error (${err.message}). Ensure backend is running on port 5000.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo gradient-text">🍽️ VoiceBite</div>
        <p className="login-subtitle">
          Staff & Admin Portal — Restricted Access
        </p>

        {/* 🔒 ACTIVE CUSTOMER SESSION BLOCKER */}
        {isCustomerLoggedIn ? (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "var(--red)",
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>
              ⚠️ Customer Session Active
            </div>
            You are logged in as <strong>{user?.name || user?.email}</strong>.
            You cannot sign into the Admin Portal while a customer account is
            logged in.
            <button
              type="button"
              onClick={logout}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "var(--red)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: "13px",
              }}
            >
              🚪 Log Out Customer Account
            </button>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "var(--orange-light)",
              lineHeight: 1.6,
            }}
          >
            🔒 Only authorised restaurant staff can access this panel. Contact
            the owner to get access.
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              disabled={isCustomerLoggedIn}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              disabled={isCustomerLoggedIn}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />
          </div>

          {error && <p className="form-error">⚠️ {error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: "24px",
              opacity: isCustomerLoggedIn ? 0.5 : 1,
              cursor: isCustomerLoggedIn ? "not-allowed" : "pointer",
            }}
            disabled={loading || isCustomerLoggedIn}
          >
            {loading ? "⏳ Verifying…" : "🔐 Login to Dashboard"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link
            to="/"
            style={{
              color: "var(--text3)",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            ← Back to Restaurant
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

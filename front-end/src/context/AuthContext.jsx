import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ─── Token helpers ─────────────────────────────────────────────────────────────

const readToken = () => {
  try {
    const t = localStorage.getItem("vb_token");
    return t && t !== "null" && t !== "undefined" ? t : null;
  } catch { return null; }
};

const readUser = () => {
  try {
    const u = localStorage.getItem("vb_user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

// Persist session
const saveSession = (token, user) => {
  localStorage.setItem("vb_token", token);
  localStorage.setItem("vb_user", JSON.stringify(user));
};

// Clear all tokens
const clearSession = () => {
  localStorage.removeItem("vb_token");
  localStorage.removeItem("vb_user");
  localStorage.removeItem("vb_admin_token");
  localStorage.removeItem("vb_admin_user");
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: clean up admin tokens if user is a plain customer
  const clearAdminTokensIfCustomer = (userData) => {
    const ADMIN_ROLES = ["staff", "sub_admin", "super_admin"];
    if (!userData || !ADMIN_ROLES.includes(userData.role)) {
      localStorage.removeItem("vb_admin_token");
      localStorage.removeItem("vb_admin_user");
    }
  };

  // ── Restore & validate session on mount ───────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const storedToken = readToken();
      const storedUser  = readUser();

      if (!storedToken || !storedUser) {
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Optimistically restore from localStorage so the UI is instant
      setToken(storedToken);
      setUser(storedUser);
      clearAdminTokensIfCustomer(storedUser);

      // Then silently validate the token against the backend
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.status === 401) {
          // Token expired or invalid — force logout
          clearSession();
          setToken(null);
          setUser(null);
          window.dispatchEvent(new Event("vb_user_change"));
        } else if (res.ok) {
          // Refresh user data from server (role may have changed etc.)
          const data = await res.json();
          // getCurrentUser now returns ApiResponse: { data: { id, name, ... } }
          const freshUser = data?.data || data;
          saveSession(storedToken, freshUser);
          setUser(freshUser);
          clearAdminTokensIfCustomer(freshUser);
        }
      } catch {
        // Network error — keep existing session, don't force logout
      } finally {
        setLoading(false);
      }
    };

    restore();
    window.addEventListener("vb_auth_change", restore);
    return () => window.removeEventListener("vb_auth_change", restore);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    // ApiResponse: { data: { user, token } }
    const payload = data.data || data;
    const newToken = payload.token;
    const newUser  = payload.user;

    saveSession(newToken, newUser);
    clearAdminTokensIfCustomer(newUser);

    // Also save as admin token if this user has an admin role
    const ADMIN_ROLES = ["staff", "sub_admin", "super_admin"];
    if (ADMIN_ROLES.includes(newUser.role)) {
      localStorage.setItem("vb_admin_token", newToken);
      localStorage.setItem("vb_admin_user", JSON.stringify(newUser));
    }

    setToken(newToken);
    setUser(newUser);
    window.dispatchEvent(new Event("vb_user_change"));
    return newUser;
  };

  // ── Register (OTP flow — called after verify-otp) ─────────────────────────
  const register = async (name, email, password, phone) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");

    const payload  = data.data || data;
    const newToken = payload.token;
    const newUser  = payload.user;

    saveSession(newToken, newUser);
    clearAdminTokensIfCustomer(newUser);
    setToken(newToken);
    setUser(newUser);
    window.dispatchEvent(new Event("vb_user_change"));
    return newUser;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    clearSession();
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("vb_user_change"));
  };

  // ── Refresh user from server (e.g. after profile update) ──────────────────
  const refreshUser = useCallback(async () => {
    const t = readToken();
    if (!t) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) { logout(); return; }
      if (res.ok) {
        const data = await res.json();
        const freshUser = data?.data || data;
        saveSession(t, freshUser);
        setUser(freshUser);
      }
    } catch { /* network error — keep existing */ }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isLoggedIn: !!user && !!readToken(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

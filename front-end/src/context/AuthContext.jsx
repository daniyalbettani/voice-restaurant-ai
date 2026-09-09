import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to purge administrative tokens if user is a regular customer
  const clearAdminTokensIfCustomer = (userData) => {
    const ALLOWED_ADMIN_ROLES = ["staff", "sub_admin", "super_admin"];
    if (!userData || !ALLOWED_ADMIN_ROLES.includes(userData.role)) {
      localStorage.removeItem("vb_admin_token");
      localStorage.removeItem("vb_admin_user");
    }
  };

  // Restore session from localStorage on mount
  useEffect(() => {
    const restore = () => {
      const storedToken = localStorage.getItem("vb_token");
      const storedUser = localStorage.getItem("vb_user");
      if (
        storedToken &&
        storedToken !== "null" &&
        storedToken !== "undefined" &&
        storedUser
      ) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          clearAdminTokensIfCustomer(parsedUser);
        } catch {
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    };
    restore();

    // Listen for OTP-based registration updates
    window.addEventListener("vb_auth_change", restore);
    return () => window.removeEventListener("vb_auth_change", restore);
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    // Store customer credentials
    localStorage.setItem("vb_token", data.token);
    localStorage.setItem("vb_user", JSON.stringify(data.user));

    // 🔒 Purge any stale admin keys if this is a regular customer
    clearAdminTokensIfCustomer(data.user);

    setToken(data.token);
    setUser(data.user);
    window.dispatchEvent(new Event("vb_user_change"));
    return data.user;
  };

  const register = async (name, email, password, phone) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");

    localStorage.setItem("vb_token", data.token);
    localStorage.setItem("vb_user", JSON.stringify(data.user));

    // 🔒 Purge any stale admin keys on registration
    clearAdminTokensIfCustomer(data.user);

    setToken(data.token);
    setUser(data.user);
    window.dispatchEvent(new Event("vb_user_change"));
    return data.user;
  };

  const logout = () => {
    // Clear customer tokens
    localStorage.removeItem("vb_token");
    localStorage.removeItem("vb_user");

    // 🔒 Clear admin tokens as well to reset session state completely
    localStorage.removeItem("vb_admin_token");
    localStorage.removeItem("vb_admin_user");

    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("vb_user_change"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isLoggedIn: !!user,
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

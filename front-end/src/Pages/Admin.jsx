import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import AdminDashboard from "../components/AdminDashboard";
import Navbar from "../components/Navbar";

// ── Safe helpers ────────────────────────────────────────────────────────────
const safeGetToken = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === "null" || val === "undefined" || val.trim() === "")
      return null;
    return val;
  } catch {
    return null;
  }
};

const safeParseUser = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === "null" || val === "undefined") return null;
    return JSON.parse(val);
  } catch {
    return null;
  }
};

const ALLOWED_ROLES = ["staff", "sub_admin", "super_admin"];

// ────────────────────────────────────────────────────────────────────────────
const Admin = () => {
  // Only the admin-portal session grants entry — never the customer session
  const adminToken = safeGetToken("vb_admin_token");
  const adminUser = safeParseUser("vb_admin_user");

  const isAllowed =
    adminToken !== null &&
    adminUser !== null &&
    ALLOWED_ROLES.includes(adminUser?.role);

  // 🔄 Auto-sync session keys on mount so Navbar & Home recognize Admin user
  useEffect(() => {
    if (isAllowed) {
      localStorage.setItem("vb_token", adminToken);
      localStorage.setItem("vb_user", JSON.stringify(adminUser));
      window.dispatchEvent(new Event("vb_auth_change"));
      window.dispatchEvent(new Event("vb_user_change"));
    }
  }, [isAllowed, adminToken, adminUser]);

  if (!isAllowed) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar isAdmin />
      <AdminDashboard />
    </div>
  );
};

export default Admin;

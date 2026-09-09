import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Home from "./Pages/home";
import Admin from "./Pages/Admin";
import AdminLogin from "./Pages/AdminLogin";
import TrackOrders from "./Pages/TrackOrders";
import Navbar from "./components/Navbar";

// 🔒 Protected Route Component for Staff/Admin Access
const AdminProtectedRoute = () => {
  const token = localStorage.getItem("vb_admin_token");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("vb_admin_user") || "{}");
    } catch {
      return null;
    }
  })();

  const isStaffOrAdmin =
    Boolean(token) &&
    Boolean(user?.role) &&
    ["staff", "sub_admin", "super_admin"].includes(user.role);

  return isStaffOrAdmin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* 🔒 Protected Admin Dashboard Route */}
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<Admin />} />
      </Route>

      <Route
        path="/track-orders"
        element={
          <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
            <Navbar />
            <TrackOrders />
          </div>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

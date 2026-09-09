import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_BASE_URL || "http://192.168.100.17:5000";

const STATUS_FLOW = {
  pending: { next: "preparing", label: "👨‍🍳 Mark Preparing", cls: "preparing" },
  preparing: { next: "ready", label: "✅ Mark Ready", cls: "ready" },
  ready: { next: "done", label: "🎉 Mark Done", cls: "done" },
  done: { next: null, label: null, cls: null },
  cancelled: { next: null, label: null, cls: null },
};

const fmt = (d) =>
  new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) +
  "  " +
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const ROLE_COLOR = {
  customer: "var(--text3)",
  staff: "var(--blue)",
  sub_admin: "#a855f7",
  super_admin: "var(--orange-light)",
};
const ROLE_LABEL = {
  customer: "👤 Customer",
  staff: "🧑‍💼 Staff",
  sub_admin: "🛡️ Sub Admin",
  super_admin: "👑 Super Admin",
};

const CANCEL_WINDOW_MS = 5 * 60 * 1000;

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [adminToken, setAdminToken] = useState("");

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    done: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("orders");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleMsg, setRoleMsg] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkDel, setBulkDel] = useState(false);
  const [now, setNow] = useState(Date.now());

  // 🔒 LIVE BACKEND AUTH VERIFICATION
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem("vb_admin_token");

      if (!token) {
        localStorage.removeItem("vb_admin_token");
        localStorage.removeItem("vb_admin_user");
        navigate("/admin/login", { replace: true });
        return;
      }

      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();

        const ALLOWED_ROLES = ["staff", "sub_admin", "super_admin"];

        // Reject if token is invalid or server responds with a customer role
        if (!res.ok || !data || !ALLOWED_ROLES.includes(data.role)) {
          localStorage.removeItem("vb_admin_token");
          localStorage.removeItem("vb_admin_user");
          navigate("/admin/login", { replace: true });
          return;
        }

        // Successfully verified
        setAdminToken(token);
        setAdminUser(data);
        localStorage.setItem("vb_admin_user", JSON.stringify(data));
        setVerifying(false);
      } catch (err) {
        console.error("Admin verification error:", err);
        localStorage.removeItem("vb_admin_token");
        localStorage.removeItem("vb_admin_user");
        navigate("/admin/login", { replace: true });
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const isSuperAdmin =
    adminUser && ["super_admin", "sub_admin"].includes(adminUser.role);
  const authHeader = {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  };

  const fetchAll = async () => {
    try {
      const [oRes, sRes] = await Promise.all([
        fetch(`${API}/api/orders`, { headers: authHeader }),
        fetch(`${API}/api/stats`, { headers: authHeader }),
      ]);
      const [oData, sData] = await Promise.all([oRes.json(), sRes.json()]);

      setOrders(Array.isArray(oData) ? oData : []);
      if (sData && !sData.message) {
        setStats(sData);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        headers: authHeader,
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (verifying) return;
    fetchAll();
    const socket = io(API, { transports: ["websocket", "polling"] });
    socket.on("newOrder", (o) => {
      setOrders((p) => [o, ...p]);
      fetchAll();
    });
    socket.on("orderUpdated", (u) => {
      setOrders((p) => p.map((o) => (o._id === u._id ? u : o)));
      fetchAll();
    });
    socket.on("orderDeleted", (id) => {
      setOrders((p) => p.filter((o) => o._id !== id));
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      fetchAll();
    });
    return () => socket.disconnect();
  }, [verifying]);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (tab === "staff" && isSuperAdmin && !verifying) fetchUsers();
  }, [tab, verifying]);

  // Loading state while checking token against database
  if (verifying) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          color: "var(--text2)",
          fontSize: "15px",
          fontWeight: 600,
          fontFamily: "Inter, sans-serif",
        }}
      >
        🔒 Verifying admin access...
      </div>
    );
  }

  const updateStatus = async (id, status) => {
    const res = await fetch(`${API}/api/orders/${id}/status`, {
      method: "PATCH",
      headers: authHeader,
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOrders((p) => p.map((o) => (o._id === id ? { ...o, status } : o)));
      fetchAll();
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    const res = await fetch(`${API}/api/orders/${id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    if (res.ok) {
      setOrders((p) => p.filter((o) => o._id !== id));
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      fetchAll();
    }
  };

  const toggleSelect = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectAll = () => setSelected(new Set(orders.map((o) => o._id)));
  const clearSelection = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} selected order(s)? This cannot be undone.`,
      )
    )
      return;
    setBulkDel(true);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "DELETE",
        headers: authHeader,
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (res.ok) {
        setOrders((p) => p.filter((o) => !selected.has(o._id)));
        setSelected(new Set());
        fetchAll();
      }
    } finally {
      setBulkDel(false);
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm("Delete ALL orders? This cannot be undone.")) return;
    setBulkDel(true);
    try {
      const ids = orders.map((o) => o._id);
      const res = await fetch(`${API}/api/orders`, {
        method: "DELETE",
        headers: authHeader,
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setOrders([]);
        setSelected(new Set());
        fetchAll();
      }
    } finally {
      setBulkDel(false);
    }
  };

  const changeRole = async (userId, newRole) => {
    setRoleMsg("");
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: authHeader,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRoleMsg("Error: " + data.message);
        return;
      }
      setUsers((p) =>
        p.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
      );
      setRoleMsg(`✅ ${data.user?.name} is now ${newRole}`);
      setTimeout(() => setRoleMsg(""), 3500);
    } catch {
      setRoleMsg("Network error");
    }
  };

  const STAT_CARDS = [
    { label: "Total Orders", value: stats.total, color: "var(--orange-light)" },
    { label: "Pending", value: stats.pending, color: "var(--yellow)" },
    { label: "Preparing", value: stats.preparing, color: "var(--blue)" },
    { label: "Ready", value: stats.ready, color: "var(--purple)" },
    { label: "Completed", value: stats.done, color: "var(--green)" },
    {
      label: "Revenue (Rs)",
      value: stats.revenue,
      color: "var(--orange-light)",
    },
  ];

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "9px 22px",
        borderRadius: "10px",
        fontFamily: "Inter,sans-serif",
        fontWeight: 700,
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s",
        background:
          tab === id
            ? "linear-gradient(135deg,var(--orange),var(--orange-dark))"
            : "var(--card)",
        border:
          tab === id ? "1px solid transparent" : "1px solid var(--border)",
        color: tab === id ? "#fff" : "var(--text2)",
      }}
    >
      {label}
    </button>
  );

  const allSelected = orders.length > 0 && selected.size === orders.length;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <div className="admin-title">🍽️ VoiceBite Admin</div>
          <p
            style={{
              color: "var(--text2)",
              fontSize: "14px",
              marginTop: "4px",
            }}
          >
            Logged in as{" "}
            <strong style={{ color: "var(--orange-light)" }}>
              {adminUser?.name || "Admin"}
            </strong>{" "}
            <span
              style={{ color: ROLE_COLOR[adminUser?.role], fontSize: "12px" }}
            >
              ({ROLE_LABEL[adminUser?.role] || "Staff"})
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="live-badge">
            <div className="live-dot" />
            LIVE
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: "13px" }}
            onClick={fetchAll}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "32px",
          flexWrap: "wrap",
        }}
      >
        <TabBtn id="orders" label="📋 Orders" />
        {isSuperAdmin && <TabBtn id="staff" label="👥 Staff Management" />}
      </div>

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <>
          {/* Stats */}
          <div className="stats-grid">
            {STAT_CARDS.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bulk action toolbar */}
          {isSuperAdmin && orders.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                padding: "14px 18px",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "var(--text2)",
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={allSelected ? clearSelection : selectAll}
                  style={{
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                    accentColor: "var(--orange)",
                  }}
                />
                {allSelected ? "Deselect All" : "Select All"}
              </label>

              {selected.size > 0 && (
                <>
                  <span style={{ color: "var(--text3)", fontSize: "13px" }}>
                    {selected.size} selected
                  </span>
                  <button
                    onClick={deleteSelected}
                    disabled={bulkDel}
                    style={{
                      padding: "7px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "var(--red)",
                      fontFamily: "Inter,sans-serif",
                    }}
                  >
                    {bulkDel
                      ? "⏳ Deleting…"
                      : `🗑 Delete Selected (${selected.size})`}
                  </button>
                  <button
                    onClick={clearSelection}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--text2)",
                      fontFamily: "Inter,sans-serif",
                    }}
                  >
                    ✕ Clear Selection
                  </button>
                </>
              )}

              <div style={{ marginLeft: "auto" }}>
                <button
                  onClick={clearAllOrders}
                  disabled={bulkDel || orders.length === 0}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "var(--red)",
                    fontFamily: "Inter,sans-serif",
                    opacity: orders.length === 0 ? 0.4 : 1,
                  }}
                >
                  🧹 Clear All Orders
                </button>
              </div>
            </div>
          )}

          {/* Orders list */}
          {loading ? (
            <div className="spinner" />
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No orders yet. Waiting for voice orders…</p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map((order) => {
                const flow = STATUS_FLOW[order.status] || {};
                const isSelected = selected.has(order._id);

                const orderAge = now - new Date(order.createdAt).getTime();
                const canPrepare = order.locked || orderAge >= CANCEL_WINDOW_MS;
                const secsLeft = Math.max(
                  0,
                  Math.ceil((CANCEL_WINDOW_MS - orderAge) / 1000),
                );
                const countdownStr = `${String(Math.floor(secsLeft / 60)).padStart(2, "0")}:${String(secsLeft % 60).padStart(2, "0")}`;
                const isChefLocked = order.status === "pending" && !canPrepare;

                return (
                  <div
                    key={order._id}
                    className="order-card"
                    style={{
                      border: isSelected
                        ? "1px solid var(--orange)"
                        : undefined,
                      background: isSelected
                        ? "rgba(249,115,22,0.04)"
                        : undefined,
                    }}
                  >
                    <div className="order-card-header">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        {isSuperAdmin && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(order._id)}
                            style={{
                              width: "15px",
                              height: "15px",
                              cursor: "pointer",
                              accentColor: "var(--orange)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <div className="order-id">
                            #{order._id.slice(-8).toUpperCase()}
                          </div>
                          <div className="order-time">
                            {fmt(order.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "6px",
                        }}
                      >
                        <span className={`badge badge-${order.status}`}>
                          {order.status === "pending" && "🕐 Pending"}
                          {order.status === "preparing" && "👨‍🍳 Preparing"}
                          {order.status === "ready" && "✅ Ready"}
                          {order.status === "done" && "🎉 Done"}
                          {order.status === "cancelled" && "❌ Cancelled"}
                        </span>
                        {order.status === "pending" && !canPrepare && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              fontFamily: "monospace",
                              color: "#f59e0b",
                              background: "rgba(245,158,11,0.12)",
                              border: "1px solid rgba(245,158,11,0.3)",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              letterSpacing: "1px",
                            }}
                          >
                            ⏳ Customer can cancel: {countdownStr}
                          </span>
                        )}
                        {order.status === "pending" &&
                          canPrepare &&
                          !order.locked && (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#22c55e",
                                background: "rgba(34,197,94,0.12)",
                                border: "1px solid rgba(34,197,94,0.3)",
                                borderRadius: "6px",
                                padding: "2px 8px",
                              }}
                            >
                              ✅ Ready to cook!
                            </span>
                          )}
                        {order.locked && order.status === "pending" && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#f59e0b",
                              background: "rgba(245,158,11,0.15)",
                              border: "1px solid rgba(245,158,11,0.4)",
                              borderRadius: "6px",
                              padding: "2px 8px",
                            }}
                          >
                            🔒 Customer Confirmed — Cook Now!
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="order-items">
                      {order.items?.map((item, i) => (
                        <div key={i} className="order-item-row">
                          <span style={{ textTransform: "capitalize" }}>
                            {item.quantity} × {item.name}
                          </span>
                          <span>Rs {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="order-footer">
                      <div className="order-total">Total: Rs {order.total}</div>
                      <div className="order-actions">
                        {flow.next &&
                          (isChefLocked ? (
                            <button
                              disabled
                              title={`Chef can start cooking in ${countdownStr}`}
                              style={{
                                padding: "8px 14px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 600,
                                fontFamily: "Inter,sans-serif",
                                background: "rgba(120,120,120,0.1)",
                                border: "1px dashed var(--border)",
                                color: "var(--text3)",
                                cursor: "not-allowed",
                                opacity: 0.7,
                              }}
                            >
                              🔒 Cook in {countdownStr}
                            </button>
                          ) : (
                            <button
                              className={`action-btn ${flow.cls}`}
                              onClick={() => updateStatus(order._id, flow.next)}
                            >
                              {flow.label}
                            </button>
                          ))}
                        {isSuperAdmin && (
                          <button
                            className="action-btn delete"
                            onClick={() => deleteOrder(order._id)}
                          >
                            🗑 Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* STAFF MANAGEMENT TAB */}
      {tab === "staff" && isSuperAdmin && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3
                style={{
                  fontWeight: 800,
                  fontSize: "20px",
                  marginBottom: "4px",
                }}
              >
                👥 Staff Access Control
              </h3>
              <p style={{ color: "var(--text2)", fontSize: "14px" }}>
                Grant or revoke dashboard access for restaurant workers
              </p>
            </div>
            {roleMsg && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: roleMsg.startsWith("✅")
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(239,68,68,0.1)",
                  border: `1px solid ${roleMsg.startsWith("✅") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  color: roleMsg.startsWith("✅")
                    ? "var(--green)"
                    : "var(--red)",
                }}
              >
                {roleMsg}
              </div>
            )}
          </div>
          {usersLoading ? (
            <div className="spinner" />
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {users.map((u) => (
                <div
                  key={u._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        overflow: "hidden",
                        background: "linear-gradient(135deg,#f97316,#ea580c)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {u.avatarUrl ? (
                        u.avatarUrl.startsWith("data:") ? (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "22px" }}>
                            {u.avatarUrl}
                          </span>
                        )
                      ) : (
                        <span
                          style={{
                            fontWeight: 900,
                            color: "#fff",
                            fontSize: "16px",
                          }}
                        >
                          {u.name?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "15px" }}>
                        {u.name}
                      </div>
                      <div style={{ color: "var(--text2)", fontSize: "13px" }}>
                        {u.email}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          marginTop: "2px",
                          color: ROLE_COLOR[u.role],
                          fontWeight: 600,
                        }}
                      >
                        {ROLE_LABEL[u.role]}
                      </div>
                    </div>
                  </div>
                  {u.role !== "super_admin" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text3)",
                        }}
                      >
                        Role:
                      </span>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u._id, e.target.value)}
                        style={{
                          background: "var(--card)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "8px 14px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        }}
                      >
                        <option value="customer">👤 Customer</option>
                        <option value="staff">🧑‍💼 Staff</option>
                        <option value="sub_admin">🛡️ Sub Admin</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

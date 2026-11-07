import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://192.168.100.17:5000";

const CATEGORIES = [
  { value: "fast-food",    label: "🍔 Fast Food" },
  { value: "main-course", label: "🍛 Main Course" },
  { value: "drinks",      label: "🥤 Drinks" },
  { value: "desserts",    label: "🍰 Desserts" },
  { value: "general",     label: "🍽️ General" },
];

const EMPTY_FORM = {
  name: "",
  price: "",
  category: "general",
  description: "",
};

// ─── Styles (inline to stay self-contained) ──────────────────────────────────
const S = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "28px 28px 24px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--text1)",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  fullRow: { gridColumn: "1 / -1" },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text2)",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg3)",
    color: "var(--text1)",
    fontSize: "14px",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg3)",
    color: "var(--text1)",
    fontSize: "14px",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "80px",
    transition: "border-color 0.2s",
  },
  select: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg3)",
    color: "var(--text1)",
    fontSize: "14px",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    cursor: "pointer",
  },
  dropzone: (dragging, hasFile) => ({
    border: `2px dashed ${dragging ? "var(--orange)" : hasFile ? "var(--green)" : "var(--border)"}`,
    borderRadius: "12px",
    padding: "30px 20px",
    textAlign: "center",
    cursor: "pointer",
    background: dragging ? "rgba(255,100,0,0.04)" : "var(--bg3)",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  }),
  preview: {
    width: "120px",
    height: "100px",
    objectFit: "cover",
    borderRadius: "10px",
    border: "2px solid var(--border)",
    marginTop: "8px",
  },
  btnPrimary: (loading) => ({
    padding: "12px 32px",
    borderRadius: "12px",
    border: "none",
    background: loading
      ? "var(--border)"
      : "linear-gradient(135deg,var(--orange),var(--orange-dark))",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    fontFamily: "Inter, sans-serif",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.2s",
  }),
  btnDanger: {
    padding: "7px 14px",
    borderRadius: "8px",
    border: "1px solid #ef444440",
    background: "#ef444415",
    color: "#ef4444",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  toast: (type) => ({
    padding: "13px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    background: type === "success" ? "#16a34a20" : "#ef444420",
    border: `1px solid ${type === "success" ? "#16a34a50" : "#ef444450"}`,
    color: type === "success" ? "#16a34a" : "#ef4444",
  }),
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
    marginTop: "4px",
  },
  menuCard: {
    background: "var(--bg3)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  menuImg: {
    width: "100%",
    height: "130px",
    objectFit: "cover",
    background: "var(--bg)",
  },
  menuInfo: {
    padding: "12px 14px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  menuName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text1)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  menuMeta: {
    fontSize: "12px",
    color: "var(--text2)",
    textTransform: "capitalize",
  },
  menuPrice: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--orange-light)",
    marginTop: "4px",
  },
};
// ─────────────────────────────────────────────────────────────────────────────

export default function AddMenuItem({ adminToken }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null); // { type, msg }
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [deleting, setDeleting]       = useState(null); // id being deleted
  const fileInputRef = useRef();

  // ── Load existing menu items ───────────────────────────────────────────────
  const fetchMenu = async () => {
    try {
      setMenuLoading(true);
      const res  = await fetch(`${API}/api/menu`);
      const data = await res.json();
      // ApiResponse wrapper
      const items = data.data || data;
      setMenuItems(Array.isArray(items) ? items : []);
    } catch {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      showToast("error", "Image must be under 5 MB.");
      return;
    }
    if (!f.type.startsWith("image/")) {
      showToast("error", "Only image files are allowed.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onFileChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim())  return showToast("error", "Item name is required.");
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      return showToast("error", "Enter a valid price.");
    if (!file) return showToast("error", "Please select an image.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name",        form.name.trim());
      fd.append("price",       form.price);
      fd.append("category",    form.category);
      fd.append("description", form.description.trim());
      fd.append("image",       file); // field name must match upload.single("image")

      const res = await fetch(`${API}/api/menu/create-item`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        // ⚠️ Do NOT set Content-Type here — browser sets it automatically
        //    with the correct multipart boundary when body is FormData
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.message || "Failed to add item.");
        return;
      }

      showToast("success", `✅ "${form.name}" added to the menu!`);
      setForm(EMPTY_FORM);
      setFile(null);
      setPreview(null);
      await fetchMenu(); // refresh list
    } catch (err) {
      showToast("error", "Network error — " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete item ───────────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    setDeleting(item._id);
    try {
      const res = await fetch(`${API}/api/menu/${item._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        setMenuItems((p) => p.filter((m) => m._id !== item._id));
        showToast("success", `🗑️ "${item.name}" removed.`);
      } else {
        const d = await res.json();
        showToast("error", d.message || "Delete failed.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setDeleting(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>

      {/* ── Add Item Form ─────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.cardTitle}>➕ Add New Menu Item</div>

        {toast && <div style={{ ...S.toast(toast.type), marginBottom: "16px" }}>{toast.msg}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={S.grid}>

            {/* Name */}
            <div>
              <label style={S.label}>Item Name *</label>
              <input
                style={S.input}
                type="text"
                placeholder="e.g. Chicken Biryani"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Price */}
            <div>
              <label style={S.label}>Price (Rs) *</label>
              <input
                style={S.input}
                type="number"
                placeholder="e.g. 350"
                min="1"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div>
              <label style={S.label}>Category</label>
              <select
                style={S.select}
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={S.label}>Description</label>
              <textarea
                style={S.textarea}
                placeholder="Short description (optional)"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Image upload — full row */}
            <div style={S.fullRow}>
              <label style={S.label}>Item Image * (max 5 MB)</label>
              <div
                style={S.dropzone(dragging, !!file)}
                onClick={() => fileInputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="preview" style={S.preview} />
                    <span style={{ fontSize: "13px", color: "var(--text2)" }}>
                      {file.name} &nbsp;·&nbsp; {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                      Click or drag to replace
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "36px" }}>📸</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text2)" }}>
                      Drag & drop an image, or click to browse
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text3)" }}>
                      PNG, JPG, WEBP — max 5 MB
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={onFileChange}
              />
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px" }}>
            <button type="submit" style={S.btnPrimary(loading)} disabled={loading}>
              {loading ? "⏳ Uploading..." : "🚀 Add to Menu"}
            </button>
            {(form.name || form.price || file) && (
              <button
                type="button"
                style={{ ...S.btnDanger, padding: "12px 20px" }}
                onClick={() => { setForm(EMPTY_FORM); setFile(null); setPreview(null); }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Existing Menu Items ───────────────────────────────── */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          🍽️ Current Menu
          <span
            style={{
              marginLeft: "auto",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text3)",
              background: "var(--bg3)",
              padding: "4px 12px",
              borderRadius: "20px",
              border: "1px solid var(--border)",
            }}
          >
            {menuItems.length} item{menuItems.length !== 1 ? "s" : ""}
          </span>
        </div>

        {menuLoading ? (
          <div style={{ color: "var(--text2)", fontSize: "14px", padding: "12px 0" }}>
            Loading menu...
          </div>
        ) : menuItems.length === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: "14px", padding: "12px 0" }}>
            No menu items yet. Add one above ☝️
          </div>
        ) : (
          <div style={S.menuGrid}>
            {menuItems.map((item) => (
              <div key={item._id} style={S.menuCard}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={S.menuImg} />
                ) : (
                  <div
                    style={{
                      ...S.menuImg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "36px",
                    }}
                  >
                    🍽️
                  </div>
                )}
                <div style={S.menuInfo}>
                  <div style={S.menuName}>{item.name}</div>
                  <div style={S.menuMeta}>{item.category?.replace("-", " ")}</div>
                  {item.description && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text3)",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.description}
                    </div>
                  )}
                  <div style={S.menuPrice}>Rs {item.price}</div>
                  <button
                    style={{ ...S.btnDanger, marginTop: "10px", width: "100%" }}
                    disabled={deleting === item._id}
                    onClick={() => handleDelete(item)}
                  >
                    {deleting === item._id ? "Deleting..." : "🗑️ Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

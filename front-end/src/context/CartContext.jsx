import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const CartContext = createContext(null);

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToken = () => {
  try {
    const t = localStorage.getItem('vb_token');
    return t && t !== 'null' && t !== 'undefined' ? t : null;
  } catch { return null; }
};

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

/**
 * Flatten a backend cart document into the flat array the UI expects:
 *   [ { _id, name, price, imageUrl, emoji, category, quantity }, ... ]
 *
 * The backend stores items as { menuItem: <Menu document>, quantity },
 * so we pull all the dish fields up to the top level.
 */
const normaliseCart = (backendCart) => {
  if (!backendCart || !Array.isArray(backendCart.items)) return [];
  return backendCart.items
    .filter(i => i.menuItem)                // drop orphaned ObjectId refs
    .map(i => ({
      _id:      i.menuItem._id,
      name:     i.menuItem.name,
      price:    i.menuItem.price,
      imageUrl: i.menuItem.imageUrl || '',
      emoji:    i.menuItem.emoji    || '🍽️',
      category: i.menuItem.category || 'general',
      quantity: i.quantity,
    }));
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const CartProvider = ({ children }) => {
  const [cart,         setCart]         = useState([]);
  const [cartTotal,    setCartTotal]    = useState(0);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [loading,      setLoading]      = useState(false);

  // Prevent duplicate simultaneous mutations (e.g. rapid +/- clicks)
  const busy = useRef(false);

  // ── Apply a backend cart response to local state ───────────────────────────
  const applyCart = useCallback((backendCart) => {
    setCart(normaliseCart(backendCart));
    setCartTotal(backendCart?.totalAmount ?? 0);
  }, []);

  // ── Fetch cart from backend ────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    const token = getToken();
    if (!token) {
      // User is logged out — wipe the cart display immediately
      setCart([]);
      setCartTotal(0);
      return;
    }
    try {
      setLoading(true);
      const res  = await fetch(`${API}/api/cart`, { headers: authHeader() });
      const data = await res.json();
      applyCart(data.data || data);
    } catch (err) {
      console.error('fetchCart error:', err);
    } finally {
      setLoading(false);
    }
  }, [applyCart]);

  /**
   * WHY we re-fetch on login / logout events:
   *
   * LOGIN  → user just got a JWT, so we immediately load their saved cart
   *          from MongoDB instead of showing an empty cart.
   *
   * LOGOUT → token is gone so getToken() returns null, and fetchCart()
   *          sets cart = [] so the UI shows an empty cart — no stale
   *          items from the previous session stay visible.
   *
   * Both events are dispatched by AuthContext via window.dispatchEvent().
   */
  useEffect(() => {
    fetchCart(); // load on mount (handles page refresh while still logged in)
    const handle = () => fetchCart();
    window.addEventListener('vb_auth_change', handle);
    window.addEventListener('vb_user_change', handle);
    return () => {
      window.removeEventListener('vb_auth_change', handle);
      window.removeEventListener('vb_user_change', handle);
    };
  }, [fetchCart]);

  // ── Add to cart ────────────────────────────────────────────────────────────
  const addToCart = useCallback(async (item, quantity = 1) => {
    if (!getToken()) { setAuthRequired(true); return false; }
    if (busy.current) return false;
    busy.current = true;
    try {
      const res  = await fetch(`${API}/api/cart/add`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({ menuItemId: item._id, quantity }),
      });
      const data = await res.json();
      if (res.ok) { applyCart(data.data || data); return true; }
      console.error('addToCart failed:', data.message);
      return false;
    } catch (err) { console.error('addToCart error:', err); return false; }
    finally { busy.current = false; }
  }, [applyCart]);

  // ── Remove item completely ─────────────────────────────────────────────────
  const removeFromCart = useCallback(async (menuItemId) => {
    if (!getToken()) return;
    try {
      const res  = await fetch(`${API}/api/cart/remove/${menuItemId}`, {
        method:  'DELETE',
        headers: authHeader(),
      });
      const data = await res.json();
      if (res.ok) applyCart(data.data || data);
    } catch (err) { console.error('removeFromCart error:', err); }
  }, [applyCart]);

  // ── Update exact quantity — single PATCH call ─────────────────────────────
  // Previously this was a workaround (delete + re-add). Now it's a direct
  // PATCH /api/cart/update/:menuItemId with the new quantity.
  const updateQty = useCallback(async (menuItemId, newQty) => {
    if (!getToken()) return;
    if (newQty <= 0) { removeFromCart(menuItemId); return; }
    if (busy.current) return;
    busy.current = true;
    try {
      const res  = await fetch(`${API}/api/cart/update/${menuItemId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({ quantity: newQty }),
      });
      const data = await res.json();
      if (res.ok) applyCart(data.data || data);
    } catch (err) { console.error('updateQty error:', err); }
    finally { busy.current = false; }
  }, [applyCart, removeFromCart]);

  // ── Clear entire cart — single DELETE call ────────────────────────────────
  // Previously this fired N parallel deletes (one per item). Now it's a
  // single DELETE /api/cart/clear that wipes everything in MongoDB at once.
  const clearCart = useCallback(async () => {
    if (!getToken()) { setCart([]); setCartTotal(0); return; }
    try {
      const res  = await fetch(`${API}/api/cart/clear`, {
        method:  'DELETE',
        headers: authHeader(),
      });
      const data = await res.json();
      if (res.ok) applyCart(data.data || data);
    } catch (err) { console.error('clearCart error:', err); }
  }, [applyCart]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart, cartTotal, cartOpen, setCartOpen,
      addToCart, removeFromCart, updateQty, clearCart,
      cartCount, loading,
      authRequired, setAuthRequired,
      refreshCart: fetchCart,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};

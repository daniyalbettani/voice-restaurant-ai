import { createContext, useContext, useState, useEffect, useRef } from 'react';

const CartContext = createContext(null);

// Return the current logged-in customer's ID (or null if not logged in)
const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('vb_user');
    if (!raw || raw === 'null') return null;
    const u = JSON.parse(raw);
    return u?._id || u?.id || null;
  } catch { return null; }
};

// Per-user cart key so each customer's cart is isolated in localStorage
const cartKey = (uid) => uid ? `vb_cart_${uid}` : null;

const loadCart = (uid) => {
  const key = cartKey(uid);
  if (!key) return [];
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
};

export const CartProvider = ({ children }) => {
  const [userId, setUserId] = useState(getCurrentUserId);
  const [cart,   setCart]   = useState(() => loadCart(getCurrentUserId()));
  const [cartOpen,     setCartOpen]     = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  // When the user ID changes, swap to that user's cart
  const prevUserRef = useRef(userId);

  useEffect(() => {
    const handleUserChange = () => {
      const newUid = getCurrentUserId();
      if (newUid !== prevUserRef.current) {
        prevUserRef.current = newUid;
        setUserId(newUid);
        setCart(loadCart(newUid)); // load new user's cart (empty if new user)
        setCartOpen(false);
      }
    };

    // Listen for login / logout events dispatched by AuthContext
    window.addEventListener('vb_user_change', handleUserChange);
    window.addEventListener('vb_auth_change', handleUserChange);
    return () => {
      window.removeEventListener('vb_user_change', handleUserChange);
      window.removeEventListener('vb_auth_change', handleUserChange);
    };
  }, []);

  // Persist cart to per-user localStorage key whenever it changes
  useEffect(() => {
    const key = cartKey(userId);
    if (key) localStorage.setItem(key, JSON.stringify(cart));
  }, [cart, userId]);

  const isUserLoggedIn = () => !!localStorage.getItem('vb_token');

  const addToCart = (item) => {
    if (!isUserLoggedIn()) {
      setAuthRequired(true);
      return false;
    }
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id);
      if (existing) return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
    return true;
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i._id !== id));

  const updateQty = (id, qty) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i._id === id ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart, cartOpen, setCartOpen,
      addToCart, removeFromCart, updateQty, clearCart,
      cartCount, cartTotal,
      authRequired, setAuthRequired,
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

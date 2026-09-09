import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vb_cart')) || []; }
    catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('vb_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id);
      if (existing) return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
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
    <CartContext.Provider value={{ cart, cartOpen, setCartOpen, addToCart, removeFromCart, updateQty, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};

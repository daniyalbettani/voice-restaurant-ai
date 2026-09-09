import { useCart } from '../context/CartContext';

const CartDrawer = () => {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, cartTotal } = useCart();

  if (!cartOpen) return null;

  return (
    <>
      <div onClick={() => setCartOpen(false)} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',animation:'fadeIn 0.2s' }} />
      <div style={{
        position:'fixed',top:0,right:0,bottom:0,zIndex:201,
        width:'100%',maxWidth:'400px',background:'var(--bg3)',
        borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column',
        animation:'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{ padding:'24px 24px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
            <span style={{ fontSize:'22px' }}>🛒</span>
            <h2 style={{ fontWeight:800,fontSize:'20px' }}>Your Cart</h2>
            {cart.length > 0 && (
              <span style={{ background:'var(--orange)',color:'#fff',borderRadius:'20px',padding:'2px 10px',fontSize:'13px',fontWeight:700 }}>
                {cart.reduce((a,i) => a+i.quantity, 0)}
              </span>
            )}
          </div>
          <button onClick={() => setCartOpen(false)} style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:'8px',padding:'7px 12px',color:'var(--text2)',cursor:'pointer',fontSize:'13px',fontFamily:'Inter,sans-serif' }}>✕</button>
        </div>

        {/* Items */}
        <div style={{ flex:1,overflowY:'auto',padding:'16px 24px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:'center',paddingTop:'60px' }}>
              <div style={{ fontSize:'72px',marginBottom:'16px' }}>🛒</div>
              <h3 style={{ fontWeight:700,fontSize:'18px',marginBottom:'8px' }}>Your cart is empty</h3>
              <p style={{ color:'var(--text2)',fontSize:'14px' }}>Add items from the menu below!</p>
              <button onClick={() => { setCartOpen(false); document.getElementById('menu')?.scrollIntoView({ behavior:'smooth' }); }}
                style={{ marginTop:'20px',padding:'10px 24px',background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'10px',color:'#fff',fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:'14px',cursor:'pointer' }}>
                Browse Menu
              </button>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
              {cart.map(item => (
                <div key={item._id} style={{ display:'flex',gap:'14px',padding:'14px',background:'var(--bg2)',borderRadius:'12px',border:'1px solid var(--border)',alignItems:'center' }}>
                  <div style={{ fontSize:'36px',width:'50px',height:'50px',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg3)',borderRadius:'10px',flexShrink:0 }}>
                    {item.emoji || '🍽️'}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:'15px',textTransform:'capitalize',marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{item.name}</div>
                    <div style={{ color:'var(--orange-light)',fontWeight:700,fontSize:'14px' }}>Rs {item.price * item.quantity}</div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:'8px',flexShrink:0 }}>
                    <button onClick={() => updateQty(item._id, item.quantity - 1)}
                      style={{ width:'28px',height:'28px',borderRadius:'8px',border:'1px solid var(--border)',background:'var(--card)',color:'var(--text)',cursor:'pointer',fontSize:'16px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                    <span style={{ fontWeight:700,fontSize:'15px',minWidth:'20px',textAlign:'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item._id, item.quantity + 1)}
                      style={{ width:'28px',height:'28px',borderRadius:'8px',border:'1px solid var(--border)',background:'var(--card)',color:'var(--text)',cursor:'pointer',fontSize:'16px',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
                    <button onClick={() => removeFromCart(item._id)}
                      style={{ width:'28px',height:'28px',borderRadius:'8px',border:'none',background:'rgba(239,68,68,0.1)',color:'#ef4444',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding:'20px 24px',borderTop:'1px solid var(--border)' }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'16px' }}>
              <span style={{ color:'var(--text2)',fontSize:'15px' }}>Total</span>
              <span style={{ fontWeight:900,fontSize:'22px',color:'var(--orange-light)' }}>Rs {cartTotal}</span>
            </div>
            <button
              onClick={() => { document.getElementById('voice')?.scrollIntoView({ behavior:'smooth' }); setCartOpen(false); }}
              style={{ width:'100%',padding:'14px',background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'12px',color:'#fff',fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:'16px',cursor:'pointer',marginBottom:'10px' }}>
              🎤 Order by Voice
            </button>
            <button onClick={clearCart}
              style={{ width:'100%',padding:'11px',background:'transparent',border:'1px solid var(--border)',borderRadius:'12px',color:'var(--text2)',fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:'14px',cursor:'pointer' }}>
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;

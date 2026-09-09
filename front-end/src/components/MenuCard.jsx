import { useCart } from '../context/CartContext';

const CATEGORY_COLORS = {
  'fast-food':   'linear-gradient(135deg,#f97316,#dc2626)',
  'main-course': 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  'drinks':      'linear-gradient(135deg,#06b6d4,#0284c7)',
};

const MenuCard = ({ item }) => {
  const { addToCart, cart } = useCart();
  const inCart = cart.find(i => i._id === item._id);
  const bg = CATEGORY_COLORS[item.category] || 'linear-gradient(135deg,#f97316,#ea580c)';

  return (
    <div className="menu-card">
      {/* Image or gradient header */}
      <div className="menu-card-header" style={{ background: bg, padding: 0, overflow: 'hidden', position: 'relative' }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <span className="menu-card-emoji">{item.emoji || '🍽️'}</span>
        )}
        <span className="menu-card-category" style={{ position:'absolute', top:'10px', right:'10px', zIndex:1 }}>
          {item.category?.replace('-', ' ')}
        </span>
      </div>

      <div className="menu-card-body">
        <h3 className="menu-card-name">{item.name}</h3>
        <p className="menu-card-desc">{item.description || 'Freshly prepared with premium ingredients'}</p>
        <div className="menu-card-footer">
          <div className="menu-card-price">Rs {item.price}</div>
          <button
            className={`add-to-cart-btn ${inCart ? 'in-cart' : ''}`}
            onClick={() => addToCart(item)}
          >
            {inCart ? `🛒 ${inCart.quantity} in cart` : '+ Add to Cart'}
          </button>
        </div>
        <p className="menu-card-voice-hint">🎤 Say "{item.name}"</p>
      </div>
    </div>
  );
};

export default MenuCard;

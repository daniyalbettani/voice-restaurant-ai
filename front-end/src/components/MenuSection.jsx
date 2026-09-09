import { useState, useEffect } from 'react';
import MenuCard from './MenuCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CATEGORIES = [
  { key: 'all', label: '🍽️ All' },
  { key: 'fast-food', label: '🍔 Fast Food' },
  { key: 'main-course', label: '🍛 Main Course' },
  { key: 'drinks', label: '🥤 Drinks' },
];

const MenuSection = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/menu`);
        const data = await res.json();
        setMenu(data);
      } catch (err) {
        console.error('Error fetching menu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const filtered = activeCategory === 'all'
    ? menu
    : menu.filter((item) => item.category === activeCategory);

  return (
    <section className="section menu-section" id="menu">
      <div className="section-header">
        <h2>Our <span className="gradient-text">Menu</span></h2>
        <p>Everything you can order by voice — just say the name!</p>
      </div>

      <div className="category-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`category-tab ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <p>No items in this category yet.</p>
        </div>
      ) : (
        <div className="menu-grid">
          {filtered.map((item) => (
            <MenuCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
};

export default MenuSection;

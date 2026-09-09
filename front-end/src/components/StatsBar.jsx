const STATS = [
  { value: '10K+', label: 'Orders Delivered', icon: '🍽️' },
  { value: '4.9★', label: 'Customer Rating',   icon: '⭐' },
  { value: '50+',  label: 'Menu Items',        icon: '📋' },
  { value: '<30s', label: 'Order Time',        icon: '⚡' },
];

const StatsBar = () => (
  <section style={{
    background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.03) 100%)',
    borderTop: '1px solid rgba(249,115,22,0.15)',
    borderBottom: '1px solid rgba(249,115,22,0.15)',
    padding: '48px 40px',
  }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {STATS.map((s) => (
        <div key={s.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>{s.icon}</div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--orange-light)', letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</div>
          <div style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '6px', fontWeight: 500 }}>{s.label}</div>
        </div>
      ))}
    </div>
  </section>
);

export default StatsBar;

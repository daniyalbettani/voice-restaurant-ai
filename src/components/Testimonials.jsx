const REVIEWS = [
  { name: 'Ahmed R.',    avatar: 'A', stars: 5, role: 'Regular Customer',   text: 'Absolutely mind-blowing! I just said "two burgers and a coke" and it processed my order instantly. The AI even replied back confirming. This is the future of restaurants.' },
  { name: 'Sara K.',    avatar: 'S', stars: 5, role: 'Food Enthusiast',     text: 'The interface is stunning — looks like an app from Silicon Valley. The dark theme, animations, and overall polish are elite. Ordered biryani by voice in 5 seconds flat.' },
  { name: 'Usman T.',   avatar: 'U', stars: 5, role: 'Tech Professional',   text: 'As a developer myself, the architecture is impressive. Real-time socket updates, voice recognition, JWT auth — this team knows what they\'re doing. Excellent final year project!' },
  { name: 'Fatima N.',  avatar: 'F', stars: 5, role: 'University Student',  text: 'I tried it with "give me three pizzas and two mango shakes" and it got every item right. The waveform animation while listening was a cool touch. Loved the experience.' },
  { name: 'Bilal M.',   avatar: 'B', stars: 5, role: 'Restaurant Manager',  text: 'The admin dashboard is exactly what I need. Real-time orders, status tracking from pending to done, and clean stats. This could genuinely replace expensive POS systems.' },
  { name: 'Zara H.',    avatar: 'Z', stars: 4, role: 'Casual Diner',        text: 'Super easy to use. No more fumbling with a menu or waiting for a waiter. Just talk and you\'re done. The order confirmation voice response was a nice professional touch.' },
];

const Stars = ({ count }) => (
  <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
    {[...Array(5)].map((_, i) => (
      <span key={i} style={{ color: i < count ? '#fbbf24' : 'var(--border)', fontSize: '16px' }}>★</span>
    ))}
  </div>
);

const Testimonials = () => (
  <section className="section" style={{ background: 'var(--bg2)' }} id="testimonials">
    <div className="section-header">
      <h2>What Our <span className="gradient-text">Customers Say</span></h2>
      <p>Real reviews from people who've experienced VoiceBite AI</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      {REVIEWS.map((r, i) => (
        <div key={i} style={{
          padding: '28px', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: '18px',
          transition: 'all 0.3s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Stars count={r.stars} />
          <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.75, marginBottom: '20px', fontStyle: 'italic' }}>
            "{r.text}"
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '16px', color: '#fff',
            }}>{r.avatar}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{r.name}</div>
              <div style={{ color: 'var(--text3)', fontSize: '12px' }}>{r.role}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default Testimonials;

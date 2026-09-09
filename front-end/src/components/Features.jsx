const FEATURES = [
  { icon: '🎤', title: 'Natural Voice AI',          desc: 'Speak naturally in any sentence. Our AI understands quantities, items, and complex orders without training.' },
  { icon: '⚡', title: 'Instant Processing',        desc: 'Orders are parsed, confirmed, and sent to the kitchen within milliseconds of you finishing your sentence.' },
  { icon: '🔊', title: 'Voice Confirmation',        desc: 'The AI waiter speaks back to confirm your order, total, and asks if you need anything else — just like a real waiter.' },
  { icon: '📊', title: 'Live Order Tracking',       desc: 'Watch your order move from Pending → Preparing → Ready in real time on the live dashboard.' },
  { icon: '📋', title: 'Dynamic Menu',              desc: 'The menu is powered by MongoDB and updates instantly. Add, remove, or change items from the admin panel.' },
  { icon: '🔒', title: 'Secure & Private',          desc: 'All user data is encrypted with bcrypt. JWTs keep your session safe. Your data is never shared.' },
];

const Features = () => (
  <section className="section" id="features">
    <div className="section-header">
      <h2>Why Choose <span className="gradient-text">VoiceBite</span></h2>
      <p>Built with cutting-edge technology to deliver the ultimate restaurant experience</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      {FEATURES.map((f, i) => (
        <div key={i}
          style={{
            padding: '28px', background: 'var(--bg3)',
            border: '1px solid var(--border)', borderRadius: '16px',
            display: 'flex', gap: '20px', alignItems: 'flex-start',
            transition: 'all 0.3s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          }}>{f.icon}</div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h3>
            <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: 1.7 }}>{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default Features;

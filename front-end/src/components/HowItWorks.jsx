const STEPS = [
  {
    num: '01',
    icon: '📋',
    title: 'Browse the Menu',
    desc: 'Explore our wide selection of dishes across categories. Everything is available by voice command.',
  },
  {
    num: '02',
    icon: '🎤',
    title: 'Speak Your Order',
    desc: 'Tap the mic and say what you want naturally — "two burgers and a coke". Our AI understands instantly.',
  },
  {
    num: '03',
    icon: '⚡',
    title: 'Instant Confirmation',
    desc: 'Your order is confirmed by voice, saved to our system, and sent to the kitchen in under a second.',
  },
  {
    num: '04',
    icon: '🍽️',
    title: 'Enjoy Your Meal',
    desc: 'Track your order status in real time. We\'ll have it ready for you fresh and on time.',
  },
];

const HowItWorks = () => (
  <section className="section" id="how-it-works" style={{ background: 'var(--bg2)' }}>
    <div className="section-header">
      <h2>How It <span className="gradient-text">Works</span></h2>
      <p>Order your favorite food in 4 simple steps — completely hands-free</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {STEPS.map((step, i) => (
        <div key={i} style={{
          padding: '32px 28px',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{
            position: 'absolute', top: '20px', right: '20px',
            fontSize: '64px', fontWeight: 900, color: 'rgba(249,115,22,0.07)',
            lineHeight: 1, fontFamily: 'Inter, sans-serif',
          }}>{step.num}</div>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>{step.icon}</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>{step.title}</h3>
          <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.7 }}>{step.desc}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;

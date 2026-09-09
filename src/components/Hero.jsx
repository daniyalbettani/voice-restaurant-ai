const Hero = () => {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero" id="hero">
      <div className="hero-floats" aria-hidden="true">
        <span className="hero-float">🍔</span>
        <span className="hero-float">🍕</span>
        <span className="hero-float">🍛</span>
        <span className="hero-float">🥤</span>
        <span className="hero-float">🍟</span>
        <span className="hero-float">🍗</span>
      </div>

      <div className="hero-content anim-fadeUp">
        <div className="hero-tag">
          <span>🤖</span> AI-Powered Voice Ordering
        </div>

        <h1>
          Order Food With Your{' '}
          <span className="gradient-text">Voice</span>
        </h1>

        <p>
          Just speak naturally — our AI understands your order, calculates your total,
          and sends it to the kitchen instantly. No tapping required.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => scrollTo('voice')} style={{ fontSize: '16px', padding: '14px 32px' }}>
            🎤 Start Voice Order
          </button>
          <button className="btn btn-ghost" onClick={() => scrollTo('menu')} style={{ fontSize: '16px', padding: '14px 32px' }}>
            📋 View Menu
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;

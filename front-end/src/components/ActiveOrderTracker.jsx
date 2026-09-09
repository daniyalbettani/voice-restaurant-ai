import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Awaiting restaurant approval', icon: '📝' },
  { key: 'preparing', label: 'Preparing', desc: 'Chef is preparing your delicious meal', icon: '🍳' },
  { key: 'ready', label: 'Ready for Pickup', desc: 'Hot & fresh, ready to enjoy!', icon: '🛍️' },
  { key: 'done', label: 'Delivered', desc: 'Enjoy your food!', icon: '🎉' },
];

const ActiveOrderTracker = () => {
  const { user, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState([]);
  const [timers, setTimers] = useState({}); // orderId -> minutes:seconds string

  const fetchActiveOrders = async () => {
    if (!isLoggedIn || !user) return;
    try {
      const uid = user._id || user.id;
      const res = await fetch(`${API}/api/orders/user/${uid}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Active orders are pending, preparing, or ready (not completed/done, not cancelled)
        // and placed within last 24 hours
        const active = data.filter(o =>
          ['pending', 'preparing', 'ready'].includes(o.status) &&
          (Date.now() - new Date(o.createdAt).getTime()) < 24 * 60 * 60 * 1000
        );
        setOrders(active);
      }
    } catch (err) {
      console.error('Error fetching active orders:', err);
    }
  };

  // Poll for status updates every 7 seconds, plus fetch initially
  useEffect(() => {
    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 7000);
    return () => clearInterval(interval);
  }, [user, isLoggedIn]);

  // Real-time ticking countdown timers for the 5-minute cancellation window
  useEffect(() => {
    const updateCountdown = () => {
      const newTimers = {};
      orders.forEach(o => {
        const timeDiffMs = Date.now() - new Date(o.createdAt).getTime();
        const limitMs = 5 * 60 * 1000;
        const remainingMs = limitMs - timeDiffMs;

        if (remainingMs > 0) {
          const totalSeconds = Math.floor(remainingMs / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          newTimers[o._id] = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          newTimers[o._id] = null; // window expired
        }
      });
      setTimers(newTimers);
    };

    updateCountdown();
    const timerInterval = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerInterval);
  }, [orders]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('⚠️ Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`${API}/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      let data = {};
      try { data = await res.json(); } catch (e) { console.error("JSON parse error:", e); }

      if (res.ok) {
        alert('Order cancelled successfully! ❌');
        fetchActiveOrders();
      } else {
        alert(data.message || 'Failed to cancel order');
      }
    } catch (err) {
      console.error("Cancel order error:", err);
      alert('Error cancelling order');
    }
  };

  if (!isLoggedIn || orders.length === 0) return null;

  return (
    <div style={{ padding: '40px 20px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        
        {/* Widget Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, background: 'linear-gradient(135deg,#f97316,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              🚚 Track Active Orders
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '4px' }}>Real-time status of your delicious items</p>
          </div>
          <span style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--orange-light)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '20px', padding: '5px 14px', fontSize: '13px', fontWeight: 800 }}>
            {orders.length} order{orders.length > 1 ? 's' : ''} active
          </span>
        </div>

        {/* Orders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {orders.map(order => {
            const currentStepIdx = STEPS.findIndex(s => s.key === order.status);
            const cancelTimeLeft = timers[order._id];

            return (
              <div key={order._id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', transition: 'all 0.3s' }}>
                
                {/* Order Meta Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                  <div>
                    <span style={{ color: 'var(--text3)', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>ORDER #{order._id.slice(-6).toUpperCase()}</span>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--orange-light)' }}>Rs {order.total}</div>
                    
                    {/* Cancellation Window / Action */}
                    {cancelTimeLeft ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          style={{
                            background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', borderRadius: '10px',
                            color: '#fff', padding: '8px 16px', fontSize: '13px', fontWeight: 800,
                            cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(239,68,68,0.3)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          ✕ Cancel Order
                        </button>
                        <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 700 }}>
                          ⏱️ Expires in {cancelTimeLeft}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>
                        🔒 Locked in kitchen
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Stepper */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginTop: '24px', flexWrap: 'wrap', gap: '20px' }}>
                  
                  {/* Visual Connection Line */}
                  <div style={{
                    position: 'absolute', top: '20px', left: '4%', right: '4%', height: '4px',
                    background: 'var(--border)', zIndex: 1, display: 'block', borderRadius: '2px'
                  }} />
                  <div style={{
                    position: 'absolute', top: '20px', left: '4%',
                    width: `${Math.max(0, currentStepIdx) * 30.6}%`, height: '4px',
                    background: 'linear-gradient(90deg,#f97316,#ea580c)', zIndex: 2,
                    transition: 'width 0.5s ease', borderRadius: '2px'
                  }} />

                  {STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentStepIdx;
                    const isActive = idx === currentStepIdx;

                    return (
                      <div key={step.key} style={{
                        flex: 1, minWidth: '80px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', zIndex: 3, textAlign: 'center'
                      }}>
                        {/* Step Bubble */}
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '50%',
                          background: isCompleted ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'var(--bg2)',
                          border: `2px solid ${isActive ? 'var(--orange-light)' : isCompleted ? 'transparent' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', boxShadow: isActive ? '0 0 15px rgba(249,115,22,0.4)' : 'none',
                          transition: 'all 0.3s'
                        }}>
                          {step.icon}
                        </div>
                        {/* Step Title */}
                        <div style={{
                          fontWeight: isActive ? 900 : 700,
                          fontSize: '14px', marginTop: '10px',
                          color: isActive ? 'var(--orange-light)' : isCompleted ? 'var(--text)' : 'var(--text3)'
                        }}>
                          {step.label}
                        </div>
                        {/* Step Description */}
                        <div style={{
                          fontSize: '11px', color: 'var(--text3)', marginTop: '4px', maxWidth: '140px',
                          display: 'block'
                        }}>
                          {step.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default ActiveOrderTracker;

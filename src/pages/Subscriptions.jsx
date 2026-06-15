import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import AddSubscriptionModal from '../components/AddSubscriptionModal';
import { t } from '../i18n/translations';

function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Subscriptions() {
  const { subscriptions, totalMonthlySubs, deleteSubscription, language } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const CYCLE_LABELS = {
    monthly: t(language, 'monthly'),
    yearly: t(language, 'yearly'),
    weekly: t(language, 'weekly'),
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">{t(language, 'subscriptions')}</h1>
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>
        {t(language, 'activeSubscriptions')}
      </div>

      {subscriptions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <p>{t(language, 'noActiveSubs')}</p>
          </div>
        </div>
      ) : (
        subscriptions.map(sub => (
          <div
            key={sub.id}
            id={`sub-${sub.id}`}
            className="sub-item"
            onClick={() => setSelected(selected === sub.id ? null : sub.id)}
          >
            <div className="sub-icon" style={{ background: 'var(--primary-light)' }}>
              {sub.emoji}
            </div>
            <div className="sub-info">
              <div className="sub-name">{sub.name}</div>
              <div className="sub-cycle">
                {CYCLE_LABELS[sub.cycle] || sub.cycle} · {new Date(sub.nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div className="sub-amount">₹{fmt(sub.amount)}</div>
              {selected === sub.id && (
                <button
                  onClick={e => { e.stopPropagation(); deleteSubscription(sub.id); setSelected(null); }}
                  style={{
                    background: 'var(--danger-light)', color: 'var(--danger)',
                    border: '1px solid var(--danger)', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, padding: '2px 8px',
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  {t(language, 'delete')}
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {/* Footer Banner */}
      <div className="subs-footer">
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>{t(language, 'totalMonthlyCost')}</div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 4 }}>
          ₹{fmt(totalMonthlySubs)}
        </div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          {subscriptions.length} {t(language, 'activeSubs')}
        </div>
      </div>

      {/* FAB */}
      <button id="fab-add-subscription" className="fab" onClick={() => setShowModal(true)} aria-label={t(language, 'addSubscription')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showModal && <AddSubscriptionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

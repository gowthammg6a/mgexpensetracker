import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

const EMOJIS = ['📺', '🎵', '☁️', '🎮', '📰', '💪', '🎬', '📚', '🛡️', '🌐'];

export default function AddSubscriptionModal({ onClose }) {
  const { addSubscription, language } = useApp();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [emoji, setEmoji] = useState('📺');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;
    addSubscription({ name: name.trim(), amount: parseFloat(amount), cycle, nextDate, emoji });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t(language, 'addSubscription')}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2 className="modal-title">{t(language, 'addSubscription')}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          {/* Emoji Picker */}
          <div className="form-group">
            <label className="form-label">{t(language, 'icon')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 40, height: 40, fontSize: 22, border: '2px solid',
                    borderColor: emoji === e ? 'var(--primary)' : 'var(--border)',
                    borderRadius: 10, background: emoji === e ? 'var(--primary-light)' : 'var(--bg)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{e}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t(language, 'serviceName')}</label>
            <input
              id="sub-name"
              className="form-input"
              type="text"
              placeholder={t(language, 'serviceNamePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t(language, 'amount')} (₹)</label>
            <input
              id="sub-amount"
              className="form-input form-input-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t(language, 'billingCycle')}</label>
            <select
              id="sub-cycle"
              className="form-select"
              value={cycle}
              onChange={e => setCycle(e.target.value)}
            >
              <option value="monthly">{t(language, 'monthly')}</option>
              <option value="yearly">{t(language, 'yearly')}</option>
              <option value="weekly">{t(language, 'weekly')}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t(language, 'nextBillingDate')}</label>
            <input
              id="sub-next-date"
              className="form-input"
              type="date"
              value={nextDate}
              onChange={e => setNextDate(e.target.value)}
            />
          </div>

          <button id="submit-subscription" type="submit" className="btn-primary">
            {t(language, 'addSubscription')}
          </button>
        </form>
      </div>
    </div>
  );
}

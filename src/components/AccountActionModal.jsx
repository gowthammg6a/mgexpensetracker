import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AccountActionModal({ account, action, onClose }) {
  const { addMoneyToAccount, removeMoneyFromAccount, transferBetweenAccounts, accounts } = useApp();
  const [amount, setAmount] = useState('');
  const [toAccountId, setToAccountId] = useState(accounts.find(a => a.id !== account.id)?.id || '');

  const otherAccounts = accounts.filter(a => a.id !== account.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (action === 'add') addMoneyToAccount(account.id, val);
    else if (action === 'remove') removeMoneyFromAccount(account.id, val);
    else if (action === 'transfer') transferBetweenAccounts(account.id, toAccountId, val);
    onClose();
  };

  const titles = { add: '+ Add Money', remove: '— Remove Money', transfer: '🔄 Transfer Money' };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-handle" />
        <div className="modal-header">
          <h2 className="modal-title">{titles[action]}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="transfer-info">
            <span style={{ fontSize: 20 }}>{account.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{account.name}</div>
              <div style={{ fontSize: 12 }}>Current balance: ₹{account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {action === 'transfer' && otherAccounts.length > 0 && (
            <div className="form-group">
              <label className="form-label">Transfer To</label>
              <select
                className="form-select"
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
              >
                {otherAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name} (₹{a.balance.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              className="form-input form-input-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            {action === 'add' ? 'Add Money' : action === 'remove' ? 'Remove Money' : 'Transfer'}
          </button>
        </form>
      </div>
    </div>
  );
}

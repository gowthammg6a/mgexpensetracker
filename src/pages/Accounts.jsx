import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import AccountActionModal from '../components/AccountActionModal';

function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Accounts() {
  const { accounts, totalBalance, setActiveAccount } = useApp();
  const [actionModal, setActionModal] = useState(null); // { account, action }

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="hero-banner" style={{ marginBottom: 16 }}>
        <div className="hero-label">Total Balance</div>
        <div className="hero-amount">₹{fmt(totalBalance)}</div>
        <div className="hero-sub">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Account Cards */}
      {accounts.map(account => (
        <div key={account.id} className={`account-card ${account.active ? 'selected' : ''}`}>
          <div className="account-card-header">
            <div>
              <div className="account-card-name">{account.name}</div>
              <div className="account-card-type">
                <span>{account.emoji}</span>
                <span>{account.type}</span>
              </div>
            </div>
            {account.active ? (
              <span className="account-badge active-badge">Active</span>
            ) : (
              <button
                className="account-badge select-btn"
                onClick={() => setActiveAccount(account.id)}
                id={`select-account-${account.id}`}
              >
                Select
              </button>
            )}
          </div>

          <div className="account-balance-section">
            <div className="account-balance-label">BALANCE</div>
            <div className="account-balance-amount">₹{fmt(account.balance)}</div>
          </div>

          <div className="account-actions">
            <button
              className="btn-add"
              onClick={() => setActionModal({ account, action: 'add' })}
              id={`add-money-${account.id}`}
            >
              + Add
            </button>
            <button
              className="btn-transfer"
              onClick={() => setActionModal({ account, action: 'transfer' })}
              id={`transfer-${account.id}`}
            >
              Transfer
            </button>
          </div>

          <button
            className="btn-remove"
            onClick={() => setActionModal({ account, action: 'remove' })}
            id={`remove-money-${account.id}`}
          >
            — Remove Money
          </button>
        </div>
      ))}

      {actionModal && (
        <AccountActionModal
          account={actionModal.account}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}

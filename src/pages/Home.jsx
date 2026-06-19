import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import AddExpenseModal from '../components/AddExpenseModal';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import SwipeableExpenseItem from '../components/SwipeableExpenseItem';
import { t } from '../i18n/translations';

function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(dateStr, language) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return language === 'Tamil' ? 'இப்போது' : 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return language === 'Tamil' ? 'நேற்று' : 'Yesterday';
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const CATEGORY_COLORS = {
  food: '#ff6b6b', transport: '#4ecdc4', entertainment: '#45b7d1',
  shopping: '#96ceb4', health: '#ff9a9e', other: '#a8edea',
};

export default function Home({ onNavigate }) {
  const { todayTotal, todayExpenses, totalBalance, thisMonthTotal, expenses, categories, language } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const recentExpenses = expenses.slice(0, 6);

  return (
    <div className="page-enter">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-banner-inner">
          <div>
            <div className="hero-label">{t(language, 'todaysSpending')}</div>
            <div className="hero-amount">₹{fmt(todayTotal)}</div>
            <div className="hero-sub">
              {todayExpenses.length} {t(language, 'transactions')} {language === 'Tamil' ? 'இன்று' : 'today'}
            </div>
          </div>
          <div className="balance-badge">
            <div className="balance-badge-label">{t(language, 'balance')}</div>
            <div className="balance-badge-amount">₹{fmt(totalBalance)}</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" style={{ marginTop: 20 }}>
        <div className="stat-card">
          <div className="stat-label">{t(language, 'thisMonth')}</div>
          <div className="stat-value">₹{fmt(thisMonthTotal)}</div>
          <div className="stat-sub">{t(language, 'totalSpent')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t(language, 'today')}</div>
          <div className="stat-value">₹{fmt(todayTotal)}</div>
          <div className="stat-sub">{todayExpenses.length} {t(language, 'transactions')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t(language, 'totalExpenses')}</div>
          <div className="stat-value">{expenses.length}</div>
          <div className="stat-sub">{t(language, 'allTime')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t(language, 'balance')}</div>
          <div className="stat-value" style={{ fontSize: 18 }}>₹{fmt(totalBalance)}</div>
          <div className="stat-sub">{t(language, 'acrossAllAccounts')}</div>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="section-header" style={{ marginTop: 24 }}>
        <span className="section-title">{t(language, 'recentExpenses')}</span>
        <button className="section-action" onClick={() => onNavigate('expenses')}>
          {t(language, 'viewAll')}
        </button>
      </div>

      {recentExpenses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p>{t(language, 'noExpensesYet')}<br />{t(language, 'clickToAdd')}</p>
          </div>
        </div>
      ) : (
        <div className="expense-list" style={{ gap: 0 }}>
          {recentExpenses.map(exp => (
            <SwipeableExpenseItem
              key={exp.id}
              expense={exp}
              onOpen={(e) => setSelectedExpense(e)}
            />
          ))}
        </div>
      )}

      {/* Scanner FAB — Coming Soon */}
      <div style={{ position: 'fixed', bottom: 90, right: 80, zIndex: 100 }}>
        {showComingSoon && (
          <div style={{
            position: 'absolute', bottom: 56, right: 0,
            background: '#1a1a2e', color: 'white', fontSize: 12, fontWeight: 700,
            padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            🚀 Coming Soon!
          </div>
        )}
        <button
          id="fab-scan-receipt"
          className="fab"
          onClick={() => setShowComingSoon(v => !v)}
          onBlur={() => setTimeout(() => setShowComingSoon(false), 200)}
          aria-label="Scan Receipt — Coming Soon"
          style={{
            position: 'static',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            boxShadow: '0 4px 15px rgba(118, 75, 162, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.85, cursor: 'not-allowed'
          }}
        >
          <span style={{ fontSize: 18 }}>📷</span>
        </button>
      </div>

      {/* FAB */}
      <button id="fab-add-expense" className="fab" onClick={() => setShowAddModal(true)} aria-label={t(language, 'addExpense')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showAddModal && <AddExpenseModal onClose={() => setShowAddModal(false)} />}
      {selectedExpense && (
        <ExpenseDetailModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} />
      )}
    </div>
  );
}

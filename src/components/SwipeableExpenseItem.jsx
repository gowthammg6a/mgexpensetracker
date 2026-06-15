import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

const CATEGORY_COLORS = {
  food: '#ff6b6b', transport: '#4ecdc4', entertainment: '#45b7d1',
  shopping: '#96ceb4', health: '#ff9a9e', other: '#a8edea',
};

function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function SwipeableExpenseItem({ expense, onOpen }) {
  const { categories, deleteExpense } = useApp();
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isScrolling = useRef(false);

  const cat = categories.find(c => c.id === expense.category) || { emoji: '📦', name: 'Other' };
  const bg = CATEGORY_COLORS[expense.category] || '#a8edea';

  const SWIPE_THRESHOLD = 75; // px to trigger delete reveal

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = false;
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;

    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Detect if it's more of a vertical scroll
    if (!isSwiping && Math.abs(dy) > Math.abs(dx)) {
      isScrolling.current = true;
      return;
    }

    if (isScrolling.current) return;

    setIsSwiping(true);

    // Only allow left swipe (negative dx)
    if (dx < 0) {
      const clampedX = Math.max(dx, -120);
      setSwipeX(clampedX);
      e.preventDefault(); // prevent scroll while swiping
    } else if (showDelete && dx > 0) {
      // Swipe right to dismiss delete
      setSwipeX(Math.min(0, -120 + dx));
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    setIsSwiping(false);

    if (isScrolling.current) return;

    if (swipeX < -SWIPE_THRESHOLD) {
      // Reveal delete button
      setSwipeX(-100);
      setShowDelete(true);
    } else {
      // Snap back
      setSwipeX(0);
      setShowDelete(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteExpense(expense.id);
  };

  const handleClick = () => {
    if (showDelete) {
      // If delete is showing, first tap closes it
      setSwipeX(0);
      setShowDelete(false);
      return;
    }
    if (!isSwiping) {
      onOpen(expense);
    }
  };

  return (
    <div
      className="swipeable-expense-wrapper"
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}
    >
      {/* Delete Background */}
      <div
        className="swipe-delete-bg"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 100,
          background: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 4,
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
        }}
        onClick={handleDelete}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>
        <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>Delete</span>
      </div>

      {/* Expense Item */}
      <div
        id={`expense-${expense.id}`}
        className="expense-item"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          marginBottom: 0,
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="expense-icon" style={{ background: bg + '30' }}>{cat.emoji}</div>
        <div className="expense-info">
          <div className="expense-name">{expense.name}</div>
          <div className="expense-meta">
            {cat.name} · {timeAgo(expense.date)}
            {expense.note && <span style={{ color: 'var(--primary)' }}> · {expense.note}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <div className="expense-amount">-₹{fmt(expense.amount)}</div>
          {/* Swipe hint on first load - only on touch devices */}
          <div className="swipe-hint">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COLORS = ['#1a8fa0', '#4ecdc4', '#ff6b6b', '#96ceb4', '#ffd93d', '#ff9a9e', '#a8edea', '#c3cfe2'];

export default function Analytics() {
  const { expenses, categories } = useApp();

  // Last 7 days data
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const total = expenses
        .filter(e => new Date(e.date).toDateString() === dayStr)
        .reduce((s, e) => s + e.amount, 0);
      days.push({
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        amount: total,
        date: d,
      });
    }
    return days;
  }, [expenses]);

  // Spending by category
  const categoryData = useMemo(() => {
    const totals = {};
    expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    return categories
      .map(cat => ({ ...cat, total: totals[cat.id] || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .map(c => ({ ...c, pct: total > 0 ? (c.total / total) * 100 : 0 }));
  }, [expenses, categories]);

  const maxDay = Math.max(...last7Days.map(d => d.amount), 1);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px 12px', fontSize: 13,
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
          <div style={{ color: 'var(--primary)' }}>₹{fmt(payload[0].value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
      </div>

      {/* Spending by Category */}
      <div className="card card-padded analytics-card">
        <div className="analytics-card-title">Spending by Category</div>
        {categoryData.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '24px 0' }}>
            No data available.
          </div>
        ) : (
          <div>
            {categoryData.map((cat, i) => (
              <div key={cat.id} className="category-bar-item">
                <div className="category-bar-label">
                  <span>{cat.emoji}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cat.name}
                  </span>
                </div>
                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{
                      width: `${cat.pct}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                <div className="category-bar-amount">
                  {cat.pct.toFixed(0)}%
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 70, textAlign: 'right', flexShrink: 0 }}>
                  ₹{cat.total >= 1000 ? (cat.total / 1000).toFixed(1) + 'k' : fmt(cat.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last 7 Days */}
      <div className="card card-padded analytics-card">
        <div className="analytics-card-title">Last 7 Days</div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--primary-light)', radius: 6 }} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {last7Days.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.amount > 0 ? (i === last7Days.length - 1 ? 'var(--primary)' : '#4ecdc4') : 'var(--bg-dark)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
        <div className="stat-card">
          <div className="stat-label">Highest Day</div>
          <div className="stat-value" style={{ fontSize: 15 }}>
            ₹{fmt(Math.max(...last7Days.map(d => d.amount)))}
          </div>
          <div className="stat-sub">
            {last7Days.find(d => d.amount === Math.max(...last7Days.map(x => x.amount)))?.day || '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">7-Day Average</div>
          <div className="stat-value" style={{ fontSize: 15 }}>
            ₹{fmt(last7Days.reduce((s, d) => s + d.amount, 0) / 7)}
          </div>
          <div className="stat-sub">Per day</div>
        </div>
      </div>
    </div>
  );
}

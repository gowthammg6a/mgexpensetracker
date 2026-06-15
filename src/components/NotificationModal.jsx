import React from 'react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

export default function NotificationModal({ onClose }) {
  const { inAppNotifs, clearNotifications, markNotificationsAsRead, language } = useApp();

  // Mark as read when opened
  React.useEffect(() => {
    markNotificationsAsRead();
  }, [markNotificationsAsRead]);

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ background: 'transparent' }} />
      <div 
        className="card"
        style={{
          position: 'absolute',
          top: 70, right: 20, width: 320, zIndex: 1000,
          maxHeight: '80vh', overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          padding: '16px 0',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Notifications</h3>
          {inAppNotifs.length > 0 && (
            <button 
              onClick={() => { clearNotifications(); onClose(); }}
              style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear All
            </button>
          )}
        </div>

        {inAppNotifs.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p>No new notifications</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {inAppNotifs.map(n => (
              <div key={n.id} style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid var(--border)',
                background: n.read ? 'transparent' : 'var(--bg-card-hover)',
                display: 'flex', gap: 12
              }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{n.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, opacity: 0.7 }}>
                    {new Date(n.id).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

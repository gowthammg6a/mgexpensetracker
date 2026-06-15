import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n/translations';

export default function Settings() {
  const { user, signOut } = useAuth();
  const {
    notificationsEnabled, setNotificationsEnabled,
    darkMode, setDarkMode, language, setLanguage,
    monthlyBudget, setMonthlyBudget,
    categories, addCategory, removeCategory,
    expenses, clearAllData, exportData, importData,
    addToast,
  } = useApp();

  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [newCatName, setNewCatName] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const importRef = useRef(null);

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput);
    if (val > 0) {
      setMonthlyBudget(val);
      addToast(t(language, 'save') + ' ✅');
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory({ name: newCatName.trim(), emoji: '🚀' });
    setNewCatName('');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) importData(file);
    e.target.value = '';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      addToast('Error signing out', 'error');
    }
  };

  const toggleNotifications = (e) => {
    const enable = e.target.checked;
    setNotificationsEnabled(enable);
    if (enable) {
      addToast('In-App Notifications Enabled! 🔔');
    } else {
      addToast('Notifications Disabled');
    }
  };

  const LANGUAGES = ['English', 'Tamil', 'Hindi', 'Telugu', 'Kannada'];

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1 className="page-title">⚙️ {t(language, 'settings')}</h1>
      </div>

      {/* Account Settings */}
      <div className="settings-section">
        <div className="settings-section-title">Account</div>
        <div className="settings-card">
          <div className="settings-item">
            <span className="settings-item-left">
              <span>👤</span> {user?.user_metadata?.full_name || user?.email?.split('@')[0]} <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>({user?.email})</span>
            </span>
            <button
              onClick={handleSignOut}
              style={{
                border: '1px solid var(--danger)', background: 'var(--danger-light)', 
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'appInformation')}</div>
        <div className="settings-card">
          <div className="settings-item" style={{ cursor: 'default' }}>
            <span className="settings-item-left">{t(language, 'appVersion')}</span>
            <span className="settings-item-right">1.0.9</span>
          </div>
          <div className="settings-item" style={{ cursor: 'default' }}>
            <span className="settings-item-left">{t(language, 'totalExpenses')}</span>
            <span className="settings-item-right">{expenses.length}</span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'appearance')}</div>
        <div className="settings-card">
          <div className="settings-item">
            <span className="settings-item-left">
              <span>🌙</span> {t(language, 'darkMode')}
            </span>
            <label className="toggle-wrap" aria-label="Toggle dark mode">
              <input
                id="toggle-dark-mode"
                type="checkbox"
                checked={darkMode}
                onChange={e => setDarkMode(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-item">
            <span className="settings-item-left">
              <span>🌐</span> {t(language, 'language')}
            </span>
            <select
              id="select-language"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                border: 'none', background: 'none', fontSize: 13,
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                outline: 'none', textAlign: 'right',
              }}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'notifications')}</div>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-left">
              <span>🔔</span> 
              <div>
                <div style={{ marginBottom: 2 }}>{t(language, 'enableNotifications')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t(language, 'notificationsDesc')}</div>
              </div>
            </div>
            <label className="toggle-wrap" aria-label="Toggle notifications">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={toggleNotifications}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Budget Settings */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'budgetSettings')}</div>
        <div className="settings-card">
          <div style={{ padding: '14px 16px' }}>
            <div className="budget-input-row">
              <div className="budget-input-wrap">
                <span className="budget-input-prefix">₹</span>
                <input
                  id="budget-input"
                  type="number"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  placeholder="10000"
                  min="1"
                />
              </div>
              <button id="save-budget" className="btn-save" onClick={handleSaveBudget}>
                {t(language, 'save')}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {t(language, 'setMonthlyLimit')}
            </div>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'currency')}</div>
        <div className="settings-card">
          <div className="settings-item" style={{ cursor: 'default' }}>
            <div>
              <div className="settings-item-left" style={{ marginBottom: 2 }}>{t(language, 'defaultCurrency')}</div>
            </div>
            <span className="settings-item-right">₹ INR</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'categories')}</div>
        <div className="settings-card">
          <div className="category-tags">
            {categories.map(cat => (
              <div key={cat.id} className="category-tag">
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
                <button
                  className="category-tag-remove"
                  onClick={() => removeCategory(cat.id)}
                  aria-label={`Remove ${cat.name}`}
                >×</button>
              </div>
            ))}
          </div>
          <div className="new-category-row">
            <span style={{ fontSize: 20 }}>🚀</span>
            <input
              id="new-category-input"
              type="text"
              placeholder={t(language, 'newCategory')}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              id="add-category-btn"
              className="btn-icon-add"
              onClick={handleAddCategory}
              aria-label="Add category"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'dataManagement')}</div>
        <div className="settings-card">
          <div className="settings-item" onClick={exportData} id="export-btn">
            <span className="settings-item-left">
              <span>📤</span> {t(language, 'exportBackup')}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          <div className="settings-item" onClick={() => importRef.current?.click()} id="import-btn">
            <span className="settings-item-left">
              <span>📥</span> {t(language, 'importBackup')}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <div
            className="settings-item danger-item"
            onClick={() => setShowClearConfirm(true)}
            id="clear-data-btn"
          >
            <span className="settings-item-left" style={{ color: 'var(--danger)' }}>
              <span>🗑️</span> {t(language, 'clearAllData')}
            </span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-section-title">{t(language, 'about')}</div>
        <div className="settings-card">
          <div style={{ padding: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>MG Expense Tracker</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
              {language === 'Tamil'
                ? 'உங்கள் தினசரி செலவுகளை கண்காணிக்கவும், வகைப்படுத்தவும், செலவு சுருக்கங்களை பார்க்கவும் ஒரு எளிய மற்றும் நேர்த்தியான செயலி.'
                : language === 'Hindi'
                ? 'अपने दैनिक खर्चों को ट्रैक करने, वर्गीकृत करने और खर्च सारांश देखने के लिए एक सरल और सुंदर ऐप।'
                : language === 'Telugu'
                ? 'మీ రోజువారీ ఖర్చులను ట్రాక్ చేయడానికి, వర్గీకరించడానికి మరియు ఖర్చు సారాంశాలను చూడడానికి ఒక సరళమైన మరియు సుందరమైన యాప్.'
                : language === 'Kannada'
                ? 'ನಿಮ್ಮ ದೈನಂದಿನ ಖರ್ಚುಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು, ವರ್ಗೀಕರಿಸಲು ಮತ್ತು ಖರ್ಚಿನ ಸಾರಾಂಶಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಒಂದು ಸರಳ ಮತ್ತು ಸುಂದರ ಅಪ್ಲಿಕೇಶನ್.'
                : 'A simple and elegant app to track your daily expenses, categorize them, and view spending summaries.'
              }
            </div>
            <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 6 }}>
              {t(language, 'createdBy')}
            </div>
          </div>
        </div>
      </div>

      {/* Clear Confirm Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--danger)' }}>⚠️ {t(language, 'clearAllData')}</h2>
              <button className="modal-close" onClick={() => setShowClearConfirm(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                {language === 'Tamil'
                  ? 'இது அனைத்து செலவுகளையும் நிரந்தரமாக நீக்கி, கணக்குகளை இயல்புநிலைக்கு மீட்டமைக்கும். இந்த செயலை மீளாக்க முடியாது.'
                  : 'This will permanently delete all expenses, reset accounts to defaults, and clear all subscriptions. This action cannot be undone.'
                }
              </p>
              <button
                id="confirm-clear"
                className="btn-danger"
                onClick={() => { clearAllData(); setShowClearConfirm(false); }}
              >
                {language === 'Tamil' ? 'ஆம், எல்லாவற்றையும் அழி' : language === 'Hindi' ? 'हाँ, सब हटाएं' : 'Yes, Clear Everything'}
              </button>
              <button
                className="btn-primary"
                style={{ marginTop: 8, background: 'var(--bg)', color: 'var(--text-primary)', border: '1.5px solid var(--border)' }}
                onClick={() => setShowClearConfirm(false)}
              >
                {t(language, 'cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}

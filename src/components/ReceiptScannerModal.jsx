import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// ── Compress image ─────────────────────────────────────────────────────────────
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
    };
    img.onerror = () => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.readAsDataURL(file);
    };
    img.src = url;
  });
}

// ── Gemini Vision API call ────────────────────────────────────────────────────
async function scanWithGemini(b64, apiKey) {
  const prompt = `Look at this receipt/bill image and extract expense info. Reply with ONLY a valid JSON object like this:
{"amount":450,"name":"Swiggy Biryani","category":"food","date":"2024-06-17","note":"dinner"}
Rules:
- category must be one of: food, transport, shopping, entertainment, health, education, utilities, other
- date format: YYYY-MM-DD (from the receipt) or null if not visible
- amount: number only (no currency symbols)
- Return ONLY the JSON object, no extra text, no markdown`;

  // Detect key type:
  // New Google AI Studio keys (2025+) start with "AQ." → use as Bearer token
  // Old keys start with "AIzaSy" → use as ?key= query param
  const isNewKeyFormat = apiKey.startsWith('AQ.');

  // Models × API versions to try
  const attempts = [
    { model: 'gemini-2.0-flash',    ver: 'v1beta' },
    { model: 'gemini-2.0-flash',    ver: 'v1' },
    { model: 'gemini-2.5-flash',    ver: 'v1beta' },
    { model: 'gemini-1.5-flash',    ver: 'v1beta' },
    { model: 'gemini-1.5-flash-8b', ver: 'v1beta' },
    { model: 'gemini-1.5-flash',    ver: 'v1' },
  ];

  const requestBody = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: b64 } },
        { text: prompt }
      ]
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 300 }
  });

  const errors = [];

  for (const { model, ver } of attempts) {
    // Try both auth methods per attempt
    const authMethods = isNewKeyFormat
      ? [
          // New key: try as Bearer token first, then as query param
          { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, url: `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent` },
          { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },             url: `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent` },
          { headers: { 'Content-Type': 'application/json' },                                       url: `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}` },
        ]
      : [
          // Old key: query param
          { headers: { 'Content-Type': 'application/json' }, url: `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}` },
        ];

    for (const { headers, url } of authMethods) {
      try {
        const res = await fetch(url, { method: 'POST', headers, body: requestBody });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = data?.error?.message || data?.error?.code || `HTTP ${res.status}`;

          // Rate limit
          if (res.status === 429) {
            const m = msg.match(/(\d+)\s*second/i);
            throw { isRateLimit: true, waitSec: m ? parseInt(m[1]) + 2 : 60 };
          }

          // Auth error — stop all retries
          if (res.status === 401) {
            throw new Error(`API Key அமைக்க முடியவில்லை (401). Settings → AI Settings-ல் key மீண்டும் paste பண்ணவும்.`);
          }

          errors.push(`${model}/${ver}: ${msg}`);
          continue;
        }

        // Success!
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          errors.push(`${model}/${ver}: JSON parse failed`);
          continue;
        }
        return JSON.parse(jsonMatch[0]);

      } catch (e) {
        if (e?.isRateLimit) throw e;
        if (e?.message?.includes('401')) throw e;
        errors.push(`${model}/${ver}: ${e.message || e}`);
      }
    }
  }

  throw new Error('Gemini AI Error:\n' + errors.slice(0, 6).map(err => `- ${err}`).join('\n'));
}


// ── Modal ──────────────────────────────────────────────────────────────────────
export default function ReceiptScannerModal({ onClose }) {
  const { categories, accounts, addExpense, addToast, geminiApiKey } = useApp();

  // steps: choose | camera | scanning | ratelimit | form
  const [step, setStep] = useState('choose');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);
  const [aiError, setAiError] = useState('');
  const [scanPct, setScanPct] = useState(0);
  const [retryIn, setRetryIn] = useState(0);
  const [zoom, setZoom] = useState(false);
  const timerRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (aiError && errorRef.current) {
      errorRef.current.scrollTop = 0;
    }
  }, [aiError]);

  // Camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [camReady, setCamReady] = useState(false);
  const [facing, setFacing] = useState('environment');

  // Form
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'food');
  const [accountId, setAccountId] = useState(accounts.find(a => a.active)?.id || accounts[0]?.id || 'current');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Camera helpers
  const startCam = useCallback(async (f = facing) => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: f } });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => { videoRef.current.play(); setCamReady(true); };
      }
    } catch { addToast('Camera denied. Please upload instead.'); setStep('choose'); }
  }, [facing]);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setCamReady(false);
  }, []);

  useEffect(() => { if (step === 'camera') startCam(); return stopCam; }, [step]);

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(blob => {
      const f = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
      setCapturedFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      stopCam();
      runAI(f);
    }, 'image/jpeg', 0.9);
  };

  // ── AI Processing ───────────────────────────────────────────────────────────
  const runAI = async (file) => {
    if (!geminiApiKey) {
      setPreviewUrl(prev => prev || URL.createObjectURL(file));
      setStep('form');
      return;
    }
    setStep('scanning'); setScanPct(0); setAiError('');
    const ticker = setInterval(() => setScanPct(p => p < 80 ? p + 7 : p), 350);

    try {
      const b64 = await compressImage(file);
      const result = await scanWithGemini(b64, geminiApiKey);
      clearInterval(ticker); setScanPct(100);

      if (result.amount)   setAmount(String(result.amount));
      if (result.name)     setName(result.name);
      if (result.note)     setNote(result.note);
      if (result.date && result.date !== 'null') setDate(result.date);
      if (result.category) {
        const c = categories.find(c => c.id === result.category);
        if (c) setCategory(c.id);
      }
      setTimeout(() => { setStep('form'); addToast('✅ Gemini AI auto-filled the details!'); }, 400);

    } catch (err) {
      clearInterval(ticker); setScanPct(0);
      if (err?.isRateLimit) {
        setRetryIn(err.waitSec);
        setStep('ratelimit');
        timerRef.current = setInterval(() => setRetryIn(s => {
          if (s <= 1) { clearInterval(timerRef.current); return 0; }
          return s - 1;
        }), 1000);
      } else {
        // Check if key is the new AQ. format (doesn't work with REST API from browser)
        if (geminiApiKey.startsWith('AQ.')) {
          setAiError(
            `⚠️ உங்கள் "AQ." key Google-ன் browser-based OAuth token — இது REST API-ல் வேலை செய்யாது.\n\n` +
            `✅ சரியான key எடுக்க:\n` +
            `1. aistudio.google.com/apikey திறக்கவும்\n` +
            `2. "+ Create API key" click பண்ணவும்\n` +
            `3. "AIzaSy..." என்று தொடங்கும் key copy பண்ணவும்\n` +
            `4. Settings → AI Settings → paste → Save பண்ணவும்`
          );
        } else {
          setAiError(err.message || 'Could not read receipt.');
        }
        setStep('form');
      }
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    setCapturedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    runAI(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(+amount) || +amount <= 0) return;
    if (!name.trim()) return;
    const [y, m, d] = date.split('-').map(Number);
    addExpense({ amount: +amount, name: name.trim(), category, date: new Date(y, m - 1, d, 12).toISOString(), note: note.trim(), accountId });
    addToast('Expense saved! 💸');
    onClose();
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setStep('choose'); setPreviewUrl(null); setCapturedFile(null);
    setAmount(''); setName(''); setNote(''); setAiError('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step === 'form' ? 700 : 460, width: '96%' }} role="dialog" aria-modal="true">
        <div className="modal-handle" />
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'camera' ? '📷 Camera' : step === 'scanning' ? '🔍 Scanning...' : '🧾 Add from Receipt'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '88vh', overflowY: 'auto', padding: '16px 20px 24px' }}>

          {/* CHOOSE */}
          {step === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: geminiApiKey ? '#ebfbee' : 'var(--primary-light)',
                border: `1px solid ${geminiApiKey ? '#2b8a3e' : 'var(--border)'}`,
                borderRadius: 10, padding: '10px 14px', fontSize: 13,
                color: geminiApiKey ? '#2b8a3e' : 'var(--text-muted)', fontWeight: 600, textAlign: 'center'
              }}>
                {geminiApiKey
                  ? '🤖 Gemini AI ready — receipt scan பண்ணினால் auto-fill ஆகும்!'
                  : '⚠️ Settings → AI Settings → Gemini API Key சேர்க்கவும்'}
              </div>

              <button onClick={() => setStep('camera')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '18px', borderRadius: 16, border: '2px solid var(--primary)',
                background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 700,
              }}>
                <span style={{ fontSize: 28 }}>📷</span> Open Camera &amp; Take Photo
              </button>

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '18px', borderRadius: 16, border: '2px dashed var(--border)',
                background: 'var(--primary-light)', cursor: 'pointer',
                fontSize: 15, fontWeight: 700, color: 'var(--primary)', position: 'relative',
              }}>
                <input type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: 28 }}>🖼️</span> Upload from Gallery
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '14px', borderRadius: 14, border: '1.5px solid var(--border)',
                background: 'var(--bg)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                color: 'var(--text-secondary)', position: 'relative',
              }}>
                <input type="file" accept="image/*" capture="environment" onChange={e => handleFile(e.target.files?.[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: 20 }}>📱</span> Mobile: Quick Capture
              </label>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                Powered by <strong>Gemini AI</strong> (Google) · Free to use · Supports JPG, PNG
              </div>
            </div>
          )}

          {/* CAMERA */}
          {step === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', minHeight: 260 }}>
                <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {[{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}].map((pos, i) => (
                  <div key={i} style={{ position:'absolute', width:24, height:24,
                    borderTop: i<2 ? '3px solid var(--primary)' : undefined,
                    borderBottom: i>=2 ? '3px solid var(--primary)' : undefined,
                    borderLeft: i%2===0 ? '3px solid var(--primary)' : undefined,
                    borderRight: i%2!==0 ? '3px solid var(--primary)' : undefined, ...pos }} />
                ))}
                <button onClick={() => { const n = facing === 'environment' ? 'user' : 'environment'; setFacing(n); startCam(n); }}
                  style={{ position:'absolute',top:10,right:10,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white',fontSize:18 }}>🔄</button>
                {!camReady && (
                  <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13 }}>Starting camera...</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { stopCam(); setStep('choose'); }} style={{ flex:1,padding:'12px',borderRadius:12,border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text-secondary)',fontWeight:600,cursor:'pointer' }}>← Back</button>
                <button onClick={capture} disabled={!camReady} style={{ flex:2,padding:'14px',borderRadius:12,border:'none',background:camReady?'var(--primary)':'var(--border)',color:'white',fontWeight:800,fontSize:16,cursor:camReady?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                  <span style={{fontSize:20}}>⊙</span> Capture
                </button>
              </div>
            </div>
          )}

          {/* SCANNING */}
          {step === 'scanning' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              {previewUrl && (
                <div style={{ position:'relative',width:160,height:220,margin:'0 auto 20px',borderRadius:12,overflow:'hidden',border:'3px solid var(--primary)',boxShadow:'0 8px 24px rgba(0,0,0,0.15)' }}>
                  <img src={previewUrl} alt="Receipt" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                  <div style={{ position:'absolute',left:0,width:'100%',height:'3px',background:'rgba(255,0,60,0.9)',boxShadow:'0 0 10px #ff003c',top:`${scanPct}%`,transition:'top 0.4s linear' }} />
                </div>
              )}
              <div style={{ fontSize:15,fontWeight:800,color:'var(--primary)',marginBottom:6 }}>🤖 Gemini AI reading receipt...</div>
              <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:14 }}>Extracting amount, name &amp; category</div>
              <div className="progress-bar-wrap" style={{ height:8,maxWidth:260,margin:'0 auto' }}>
                <div className="progress-bar-fill" style={{ width:`${scanPct}%`,height:8,transition:'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* RATE LIMIT */}
          {step === 'ratelimit' && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              {previewUrl && <img src={previewUrl} alt="Receipt" style={{ width:110,height:150,objectFit:'cover',borderRadius:10,border:'2px solid var(--border)',marginBottom:16 }} />}
              <div style={{ fontSize:36,marginBottom:10 }}>⏳</div>
              <div style={{ fontWeight:800,fontSize:15,marginBottom:6 }}>Gemini API Rate Limit</div>
              <div style={{ fontSize:13,color:'var(--text-muted)',lineHeight:1.6,marginBottom:18 }}>
                {retryIn > 0
                  ? <>API busy. Retry in <strong style={{color:'var(--primary)',fontSize:15}}>{retryIn}s</strong></>
                  : 'Ready to retry!'}
              </div>
              <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
                <button
                  onClick={() => { clearInterval(timerRef.current); capturedFile && runAI(capturedFile); }}
                  disabled={retryIn > 0}
                  style={{ padding:'12px 24px',borderRadius:12,border:'none',fontWeight:700,fontSize:14,cursor:retryIn>0?'not-allowed':'pointer',background:retryIn>0?'var(--border)':'var(--primary)',color:'white',opacity:retryIn>0?0.6:1 }}
                >
                  {retryIn > 0 ? `⏳ ${retryIn}s` : '🔄 Retry Now'}
                </button>
                <button onClick={() => { clearInterval(timerRef.current); setStep('form'); }}
                  style={{ padding:'12px 20px',borderRadius:12,border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text-primary)',fontWeight:600,fontSize:14,cursor:'pointer' }}>
                  ✍️ Fill Manually
                </button>
              </div>
            </div>
          )}

          {/* FORM */}
          {step === 'form' && (
            <div style={{ display:'flex',gap:20,alignItems:'flex-start',flexWrap:'wrap' }}>
              {previewUrl && (
                <div style={{ flex:'0 0 auto',width:190 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>📄 Receipt</div>
                  <div onClick={() => setZoom(!zoom)} style={{ borderRadius:12,overflow:'hidden',border:'2px solid var(--primary)',cursor:'zoom-in',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',position:'relative' }}>
                    <img src={previewUrl} alt="Receipt" style={{ width:'100%',display:'block',objectFit:'contain',maxHeight:zoom?600:260,transition:'max-height 0.3s' }} />
                    <div style={{ position:'absolute',bottom:6,right:6,background:'rgba(0,0,0,0.5)',borderRadius:6,padding:'2px 7px',fontSize:11,color:'white',fontWeight:600 }}>
                      {zoom ? '🔍 Shrink' : '🔍 Zoom'}
                    </div>
                  </div>
                  <button onClick={reset} style={{ marginTop:10,width:'100%',padding:'8px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text-muted)',fontSize:12,cursor:'pointer',fontWeight:600 }}>
                    ↩ Re-scan
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ flex:1,minWidth:220,display:'flex',flexDirection:'column',gap:13 }}>
                {aiError ? (
                  <div ref={errorRef} style={{ fontSize:11,color:'var(--danger)',background:'#fff5f5',border:'1px solid var(--danger)',borderRadius:8,padding:'8px 12px',whiteSpace:'pre-wrap',maxHeight:'120px',overflowY:'auto',lineHeight:'1.5' }}>
                    ⚠️ {aiError}
                    {!geminiApiKey && (
                      <div style={{ marginTop:6,fontWeight:700 }}>
                        👉 Settings → AI Settings → Gemini API Key-ஐ சேர்க்கவும்.<br/>
                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color:'var(--primary)' }}>aistudio.google.com</a> இல் இலவசமாக பெறலாம்.
                      </div>
                    )}
                  </div>
                ) : previewUrl && !aiError && (
                  <div style={{ fontSize:12,color:'#2b8a3e',fontWeight:700 }}>🤖 Gemini AI auto-filled — review &amp; save</div>
                )}

                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input className="form-input form-input-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus required />
                </div>
                <div className="form-group">
                  <label className="form-label">Expense Name *</label>
                  <input className="form-input" type="text" placeholder="e.g. Swiggy, Petrol..." value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deduct From</label>
                  <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name} (₹{a.balance.toLocaleString('en-IN')})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <input className="form-input" type="text" placeholder="Additional details..." value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" style={{ margin:0,marginTop:4 }}>Save Expense 💸</button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

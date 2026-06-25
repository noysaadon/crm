import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isResetMode, setIsResetMode] = useState(false)

  useEffect(() => {
    // בדוק אם המשתמש הגיע מקישור איפוס סיסמה
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setIsResetMode(true)
    }
  }, [])

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      setError('הסיסמה חייבת להיות לפחות 6 תווים')
      return
    }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setError(error.message)
    else {
      setSuccess('הסיסמה עודכנה בהצלחה! מעביר אותך...')
      setTimeout(() => {
        setIsResetMode(false)
        window.location.hash = ''
      }, 2000)
    }
    setLoading(false)
  }

  async function handleSubmit() {
    setLoading(true); setError(''); setSuccess('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('אימייל או סיסמה שגויים')
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('נשלח אימייל אישור! בדקי את תיבת הדואר.')
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setSuccess('נשלח מייל לאיפוס סיסמה! בדקי את תיבת הדואר.')
    }
    setLoading(false)
  }

  const s = {
    wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f4f0', fontFamily:"'Heebo', sans-serif", direction:'rtl' },
    box: { background:'#fff', borderRadius:16, padding:'40px 36px', width:380, border:'0.5px solid #e0dfd8', boxShadow:'0 4px 24px rgba(0,0,0,.06)' },
    label: { fontSize:12, color:'#666', fontWeight:500, display:'block', marginBottom:4 },
    input: { width:'100%', padding:'9px 12px', fontSize:14, border:'0.5px solid #ccc', borderRadius:8, fontFamily:'inherit', background:'#fafafa', boxSizing:'border-box' },
    btn: (disabled) => ({ width:'100%', padding:'10px', fontSize:14, fontWeight:500, background:disabled?'#aaa':'#185FA5', color:'#fff', border:'none', borderRadius:8, cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit', marginTop:4 }),
    error: { background:'#FCEBEB', color:'#A32D2D', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 },
    success: { background:'#EAF3DE', color:'#27500A', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 },
    link: { fontSize:13, color:'#185FA5', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 },
    small: { fontSize:12, color:'#888', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 },
  }

  // מסך איפוס סיסמה — נכנס מהקישור במייל
  if (isResetMode) return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={{marginBottom:28, textAlign:'center'}}>
          <div style={{fontSize:28, marginBottom:8}}>🔐</div>
          <h1 style={{fontSize:20, fontWeight:600, color:'#1a1a1a', margin:0}}>מטבחי CRM</h1>
          <p style={{color:'#888', fontSize:13, margin:'6px 0 0'}}>הגדרת סיסמה חדשה</p>
        </div>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div>
            <label style={s.label}>סיסמה חדשה</label>
            <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
              placeholder="לפחות 6 תווים" style={s.input}
              onKeyDown={e=>e.key==='Enter'&&handleResetPassword()}/>
          </div>
          <button onClick={handleResetPassword} disabled={loading||!newPassword} style={s.btn(loading||!newPassword)}>
            {loading ? 'שומר...' : 'שמור סיסמה חדשה'}
          </button>
        </div>
      </div>
    </div>
  )

  const titles = { login:'כניסה לחשבון', signup:'יצירת חשבון חדש', reset:'איפוס סיסמה' }
  const btnLabels = { login:'כניסה', signup:'יצירת חשבון', reset:'שלח מייל איפוס' }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={{marginBottom:28, textAlign:'center'}}>
          <div style={{fontSize:28, marginBottom:8}}>🏠</div>
          <h1 style={{fontSize:20, fontWeight:600, color:'#1a1a1a', margin:0}}>מטבחי CRM</h1>
          <p style={{color:'#888', fontSize:13, margin:'6px 0 0'}}>{titles[mode]}</p>
        </div>
        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div>
            <label style={s.label}>אימייל</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="name@company.com" style={{...s.input, direction:'ltr'}}
              onKeyDown={e=>e.key==='Enter'&&!loading&&handleSubmit()}/>
          </div>
          {mode !== 'reset' && (
            <div>
              <label style={s.label}>סיסמה</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="לפחות 6 תווים" style={s.input}
                onKeyDown={e=>e.key==='Enter'&&!loading&&handleSubmit()}/>
            </div>
          )}
          <button onClick={handleSubmit}
            disabled={loading || !email || (mode !== 'reset' && !password)}
            style={s.btn(loading || !email || (mode !== 'reset' && !password))}>
            {loading ? 'טוען...' : btnLabels[mode]}
          </button>
        </div>
        <div style={{textAlign:'center', marginTop:18, display:'flex', flexDirection:'column', gap:8}}>
          {mode === 'login' && <>
            <button onClick={()=>{setMode('reset');setError('');setSuccess('')}} style={s.small}>
              שכחתי סיסמה
            </button>
            <div>
              <span style={{fontSize:13, color:'#666'}}>אין לך חשבון? </span>
              <button onClick={()=>{setMode('signup');setError('');setSuccess('')}} style={s.link}>הרשם</button>
            </div>
          </>}
          {mode === 'signup' && (
            <div>
              <span style={{fontSize:13, color:'#666'}}>כבר יש לך חשבון? </span>
              <button onClick={()=>{setMode('login');setError('');setSuccess('')}} style={s.link}>כניסה</button>
            </div>
          )}
          {mode === 'reset' && (
            <button onClick={()=>{setMode('login');setError('');setSuccess('')}} style={s.link}>
              ← חזרה לכניסה
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

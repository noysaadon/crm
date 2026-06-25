import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const titles = { login:'כניסה לחשבון', signup:'יצירת חשבון חדש', reset:'איפוס סיסמה' }
  const btnLabels = { login:'כניסה', signup:'יצירת חשבון', reset:'שלח מייל איפוס' }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#f5f4f0', fontFamily:"'Heebo', sans-serif", direction:'rtl'
    }}>
      <div style={{
        background:'#fff', borderRadius:16, padding:'40px 36px',
        width:380, border:'0.5px solid #e0dfd8', boxShadow:'0 4px 24px rgba(0,0,0,.06)'
      }}>
        <div style={{marginBottom:28, textAlign:'center'}}>
          <div style={{fontSize:28, marginBottom:8}}>🏠</div>
          <h1 style={{fontSize:20, fontWeight:600, color:'#1a1a1a', margin:0}}>מטבחי CRM</h1>
          <p style={{color:'#888', fontSize:13, margin:'6px 0 0'}}>{titles[mode]}</p>
        </div>

        {error && (
          <div style={{background:'#FCEBEB', color:'#A32D2D', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16}}>
            {error}
          </div>
        )}
        {success && (
          <div style={{background:'#EAF3DE', color:'#27500A', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16}}>
            {success}
          </div>
        )}

        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div>
            <label style={{fontSize:12, color:'#666', fontWeight:500, display:'block', marginBottom:4}}>אימייל</label>
            <input
              type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{width:'100%', padding:'9px 12px', fontSize:14, border:'0.5px solid #ccc', borderRadius:8, direction:'ltr', fontFamily:'inherit', background:'#fafafa', boxSizing:'border-box'}}
              onKeyDown={e=>e.key==='Enter'&&!loading&&handleSubmit()}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label style={{fontSize:12, color:'#666', fontWeight:500, display:'block', marginBottom:4}}>סיסמה</label>
              <input
                type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                style={{width:'100%', padding:'9px 12px', fontSize:14, border:'0.5px solid #ccc', borderRadius:8, fontFamily:'inherit', background:'#fafafa', boxSizing:'border-box'}}
                onKeyDown={e=>e.key==='Enter'&&!loading&&handleSubmit()}
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || (mode !== 'reset' && !password)}
            style={{
              width:'100%', padding:'10px', fontSize:14, fontWeight:500,
              background:loading?'#888':'#185FA5', color:'#fff',
              border:'none', borderRadius:8, cursor:loading?'not-allowed':'pointer',
              fontFamily:'inherit', marginTop:4
            }}
          >
            {loading ? 'טוען...' : btnLabels[mode]}
          </button>
        </div>

        <div style={{textAlign:'center', marginTop:18, display:'flex', flexDirection:'column', gap:8}}>
          {mode === 'login' && <>
            <button onClick={()=>{setMode('reset');setError('');setSuccess('')}}
              style={{fontSize:12, color:'#888', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0}}>
              שכחתי סיסמה
            </button>
            <div>
              <span style={{fontSize:13, color:'#666'}}>אין לך חשבון? </span>
              <button onClick={()=>{setMode('signup');setError('');setSuccess('')}}
                style={{fontSize:13, color:'#185FA5', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0}}>
                הרשם
              </button>
            </div>
          </>}

          {mode === 'signup' && (
            <div>
              <span style={{fontSize:13, color:'#666'}}>כבר יש לך חשבון? </span>
              <button onClick={()=>{setMode('login');setError('');setSuccess('')}}
                style={{fontSize:13, color:'#185FA5', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0}}>
                כניסה
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <button onClick={()=>{setMode('login');setError('');setSuccess('')}}
              style={{fontSize:13, color:'#185FA5', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0}}>
              ← חזרה לכניסה
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'

const STATUS_LABELS = { new:'ליד חדש', contact:'יצירת קשר', design:'תכנון מטבח', offer:'הצעת מחיר', closed:'סגירה', lost:'אבוד' }
const STATUS_ORDER = ['new','contact','design','offer','closed','lost']

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

async function callClaude(messages, system = '') {
  // NOTE: בייצור — העבר את ה-API key לשרת backend
  // כאן לצורך הדגמה בלבד
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY || ''
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: system || 'אתה עוזר CRM חכם לחברת מטבחים ישראלית. ענה בעברית, בצורה קצרה ומקצועית.',
      messages
    })
  })
  const d = await res.json()
  return d.content?.find(b => b.type === 'text')?.text || ''
}

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const globalCSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { font-family: 'Heebo', sans-serif; direction: rtl; background: #f5f4f0; color: #1a1a1a; }
:root {
  --blue: #185FA5; --blue-dark: #0C447C; --blue-light: #E6F1FB;
  --border: #e0dfd8; --bg: #f5f4f0; --card: #ffffff;
  --text: #1a1a1a; --muted: #666; --faint: #999;
  --green: #3B6D11; --green-light: #EAF3DE;
  --red: #A32D2D; --red-light: #FCEBEB;
  --amber: #854F0B; --amber-light: #FAEEDA;
  --radius: 10px; --radius-sm: 7px;
}
.app { display: flex; height: 100vh; overflow: hidden; }
.sidebar { width: 220px; background: var(--card); border-left: 0.5px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
.logo { padding: 20px 18px 16px; border-bottom: 0.5px solid var(--border); }
.logo h1 { font-size: 15px; font-weight: 600; color: var(--text); }
.logo p { font-size: 11px; color: var(--muted); margin-top: 3px; }
.nav { flex: 1; padding: 8px 0; overflow-y: auto; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 18px; cursor: pointer; font-size: 13px; color: var(--muted); border-right: 3px solid transparent; transition: all .14s; position: relative; }
.nav-item:hover { background: var(--bg); color: var(--text); }
.nav-item.active { background: var(--bg); color: var(--blue); border-right-color: var(--blue); font-weight: 500; }
.nav-badge { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); min-width: 18px; height: 18px; background: #E24B4A; color: #fff; border-radius: 9px; font-size: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
.sidebar-footer { padding: 14px 18px; border-top: 0.5px solid var(--border); font-size: 12px; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar { background: var(--card); border-bottom: 0.5px solid var(--border); padding: 12px 22px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
.topbar h2 { font-size: 15px; font-weight: 600; color: var(--text); }
.content { flex: 1; padding: 20px 22px; overflow-y: auto; }
.btn { padding: 7px 16px; font-size: 13px; font-weight: 500; border: 0.5px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; background: transparent; color: var(--text); transition: all .14s; font-family: inherit; }
.btn:hover { background: var(--bg); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn.primary { background: var(--blue); color: #fff; border-color: var(--blue); }
.btn.primary:hover { background: var(--blue-dark); }
.btn.danger { color: var(--red); border-color: transparent; }
.btn.danger:hover { background: var(--red-light); }
.btn.sm { padding: 4px 11px; font-size: 12px; }
.btn.ghost { border-color: transparent; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.kpi { background: var(--card); border: 0.5px solid var(--border); border-radius: var(--radius); padding: 16px; }
.kpi-label { font-size: 11px; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
.kpi-val { font-size: 24px; font-weight: 600; color: var(--text); }
.kpi-sub { font-size: 11px; color: var(--faint); margin-top: 3px; }
.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card { background: var(--card); border: 0.5px solid var(--border); border-radius: var(--radius); padding: 18px; }
.card-title { font-size: 11px; font-weight: 500; color: var(--muted); margin-bottom: 14px; text-transform: uppercase; letter-spacing: .04em; }
.funnel-row { margin-bottom: 9px; }
.funnel-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; color: var(--muted); }
.funnel-track { height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; }
.funnel-fill { height: 100%; border-radius: 3px; background: var(--blue); transition: width .4s; }
.activity-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 0.5px solid var(--border); }
.activity-row:last-child { border: none; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); margin-top: 5px; flex-shrink: 0; }
.act-time { color: var(--faint); font-size: 11px; margin-top: 2px; }
.filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
.fbtn { padding: 5px 12px; font-size: 12px; border: 0.5px solid var(--border); border-radius: 20px; cursor: pointer; background: transparent; color: var(--muted); font-family: inherit; transition: all .14s; }
.fbtn:hover { color: var(--text); border-color: #aaa; }
.fbtn.active { background: var(--text); color: #fff; border-color: var(--text); }
.table-wrap { background: var(--card); border: 0.5px solid var(--border); border-radius: var(--radius); overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
thead { background: var(--bg); }
th { padding: 10px 14px; text-align: right; font-weight: 500; font-size: 11px; color: var(--muted); border-bottom: 0.5px solid var(--border); text-transform: uppercase; letter-spacing: .03em; }
td { padding: 10px 14px; border-bottom: 0.5px solid var(--border); vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tr:last-child td { border: none; }
tr:hover td { background: var(--bg); }
.sbadge { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.s-new { background: var(--blue-light); color: #0C447C; }
.s-contact { background: var(--amber-light); color: var(--amber); }
.s-design { background: var(--green-light); color: var(--green); }
.s-offer { background: #EEEDFE; color: #3C3489; }
.s-closed { background: var(--green-light); color: #177a3c; }
.s-lost { background: var(--red-light); color: var(--red); }
.ph { color: var(--red); font-size: 11px; font-weight: 500; }
.pm { color: var(--amber); font-size: 11px; font-weight: 500; }
.pl { color: var(--green); font-size: 11px; font-weight: 500; }
.kanban { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; align-items: flex-start; }
.kcol { min-width: 200px; flex: 1; }
.khdr { padding: 10px 12px; font-size: 11px; font-weight: 500; color: var(--muted); display: flex; justify-content: space-between; align-items: center; text-transform: uppercase; letter-spacing: .04em; }
.kcnt { display: flex; flex-direction: column; gap: 8px; min-height: 80px; }
.kcard { background: var(--card); border: 0.5px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; cursor: pointer; }
.kcard:hover { border-color: #aaa; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.kname { font-weight: 500; font-size: 13px; color: var(--text); margin-bottom: 4px; }
.kmeta { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.fb-tag { display: inline-flex; align-items: center; gap: 3px; background: var(--blue-light); color: #0C447C; font-size: 10px; padding: 2px 7px; border-radius: 10px; margin-top: 5px; }
.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal { background: var(--card); border-radius: 14px; width: 560px; max-width: 95vw; max-height: 90vh; overflow-y: auto; padding: 28px; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 22px; color: var(--text); }
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ffield { display: flex; flex-direction: column; gap: 5px; }
.ffield.full { grid-column: 1 / -1; }
.flabel { font-size: 11px; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: .03em; }
.finput { padding: 8px 12px; font-size: 13px; border: 0.5px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); color: var(--text); direction: rtl; font-family: inherit; }
.finput:focus { outline: none; border-color: var(--blue); background: var(--card); }
.modal-foot { display: flex; gap: 8px; margin-top: 22px; align-items: center; }
.fb-inbox { display: flex; flex-direction: column; gap: 12px; }
.fb-card { background: var(--card); border: 0.5px solid var(--border); border-radius: var(--radius); padding: 16px; }
.fb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.fb-sender { font-weight: 500; font-size: 14px; }
.fb-time { font-size: 11px; color: var(--faint); }
.fb-text { font-size: 13px; color: var(--muted); line-height: 1.65; margin-bottom: 12px; }
.imported-tag { font-size: 11px; color: var(--green); background: var(--green-light); padding: 3px 9px; border-radius: 20px; }
.ai-tabs { display: flex; border-bottom: 0.5px solid var(--border); margin-bottom: 18px; }
.ai-tab { padding: 9px 18px; font-size: 13px; cursor: pointer; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -0.5px; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; }
.ai-tab.active { color: var(--blue); border-bottom-color: var(--blue); font-weight: 500; }
.ai-tab:hover { color: var(--text); }
.ai-box { background: var(--card); border: 0.5px solid var(--border); border-radius: var(--radius); padding: 18px; }
.ai-result { margin-top: 16px; padding: 16px; background: var(--bg); border-radius: var(--radius-sm); font-size: 13px; line-height: 1.85; color: var(--text); white-space: pre-wrap; }
.chat-messages { display: flex; flex-direction: column; gap: 10px; max-height: 360px; overflow-y: auto; padding: 4px 0; }
.chat-msg { display: flex; gap: 8px; }
.chat-msg.user { flex-direction: row-reverse; }
.chat-bubble { padding: 10px 14px; border-radius: var(--radius); font-size: 13px; line-height: 1.6; max-width: 80%; }
.chat-msg.ai .chat-bubble { background: var(--bg); color: var(--text); border: 0.5px solid var(--border); }
.chat-msg.user .chat-bubble { background: var(--blue); color: #fff; }
.chat-input-row { display: flex; gap: 8px; margin-top: 12px; }
.chat-input { flex: 1; padding: 9px 14px; font-size: 13px; border: 0.5px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); color: var(--text); direction: rtl; font-family: inherit; }
.chat-input:focus { outline: none; border-color: var(--blue); }
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--blue); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.search { padding: 7px 14px; font-size: 13px; border: 0.5px solid var(--border); border-radius: 20px; background: var(--bg); color: var(--text); width: 200px; direction: rtl; font-family: inherit; }
.search:focus { outline: none; border-color: var(--blue); }
.reports-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.lead-sel { padding: 8px 12px; font-size: 13px; border: 0.5px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); color: var(--text); direction: rtl; font-family: inherit; width: 100%; }
.save-bar { background: var(--bg); border-bottom: 0.5px solid var(--border); padding: 4px 22px; font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.sync-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }
`

/* ─── Tiny helpers ────────────────────────────────────────────────────────── */
function StatusBadge({ s }) {
  const cls = { new:'s-new', contact:'s-contact', design:'s-design', offer:'s-offer', closed:'s-closed', lost:'s-lost' }
  return <span className={`sbadge ${cls[s]}`}>{STATUS_LABELS[s]}</span>
}
function PrioBadge({ p }) {
  return <span className={p==='גבוהה'?'ph':p==='נמוכה'?'pl':'pm'}>{p}</span>
}

/* ─── Dashboard ───────────────────────────────────────────────────────────── */
function Dashboard({ leads }) {
  const total = leads.length
  const active = leads.filter(l => !['closed','lost'].includes(l.status)).length
  const closed = leads.filter(l => l.status === 'closed').length
  const rev = leads.filter(l => l.status === 'closed').reduce((s,l) => s+l.budget, 0)
  const counts = {}; STATUS_ORDER.forEach(s => counts[s] = leads.filter(l => l.status === s).length)
  const maxC = Math.max(...Object.values(counts), 1)
  return <>
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">סה"כ לידים</div><div className="kpi-val">{total}</div><div className="kpi-sub">כל הזמנים</div></div>
      <div className="kpi"><div className="kpi-label">לידים פעילים</div><div className="kpi-val">{active}</div><div className="kpi-sub">בטיפול</div></div>
      <div className="kpi"><div className="kpi-label">עסקאות סגורות</div><div className="kpi-val">{closed}</div><div className="kpi-sub">החודש</div></div>
      <div className="kpi"><div className="kpi-label">הכנסות סגורות</div><div className="kpi-val">₪{Math.round(rev/1000)}K</div></div>
    </div>
    <div className="dash-grid">
      <div className="card">
        <div className="card-title">משפך מכירות</div>
        {STATUS_ORDER.map(s => <div key={s} className="funnel-row">
          <div className="funnel-top"><span>{STATUS_LABELS[s]}</span><span>{counts[s]}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(counts[s]/maxC*100)}%`}}/></div>
        </div>)}
      </div>
      <div className="card">
        <div className="card-title">לידים לפי מקור</div>
        {Object.entries(leads.reduce((acc,l)=>{acc[l.source]=(acc[l.source]||0)+1;return acc},{}))
          .sort((a,b)=>b[1]-a[1]).slice(0,6).map(([src,cnt])=><div key={src} className="funnel-row">
            <div className="funnel-top"><span>{src}</span><span>{cnt}</span></div>
            <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(cnt/Math.max(leads.length,1)*100)}%`,background:'#854F0B'}}/></div>
          </div>)}
      </div>
    </div>
  </>
}

/* ─── Leads Table ─────────────────────────────────────────────────────────── */
function LeadsTable({ leads, onEdit }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const list = leads.filter(l => {
    const mq = !q || l.name.includes(q) || l.city?.includes(q) || l.phone?.includes(q)
    return mq && (filter === 'all' || l.status === filter)
  })
  return <>
    <div style={{display:'flex',gap:12,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
      <input className="search" placeholder="חיפוש לפי שם, עיר, טלפון..." value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="filter-bar">
        {['all',...STATUS_ORDER].map(s=><button key={s} className={`fbtn${filter===s?' active':''}`} onClick={()=>setFilter(s)}>{s==='all'?'הכל':STATUS_LABELS[s]}</button>)}
      </div>
    </div>
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th style={{width:'20%'}}>לקוח</th><th style={{width:'13%'}}>טלפון</th>
          <th style={{width:'11%'}}>תקציב</th><th style={{width:'13%'}}>שלב</th>
          <th style={{width:'9%'}}>עדיפות</th><th style={{width:'11%'}}>מקור</th>
          <th style={{width:'10%'}}>נציג</th><th style={{width:'9%'}}>תאריך</th><th style={{width:'4%'}}></th>
        </tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={9} style={{textAlign:'center',color:'var(--muted)',padding:28}}>אין לידים</td></tr>}
          {list.map(l=><tr key={l.id} style={{cursor:'pointer'}} onClick={()=>onEdit(l)}>
            <td><div style={{fontWeight:500}}>{l.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{l.city}{l.fb_msg?' · 📘':''}</div></td>
            <td style={{color:'var(--muted)'}}>{l.phone}</td>
            <td style={{fontWeight:500}}>₪{(l.budget||0).toLocaleString()}</td>
            <td><StatusBadge s={l.status}/></td>
            <td><PrioBadge p={l.priority}/></td>
            <td style={{color:'var(--muted)',fontSize:12}}>{l.source}</td>
            <td style={{color:'var(--muted)',fontSize:12}}>{l.assigned||'—'}</td>
            <td style={{color:'var(--faint)',fontSize:12}}>{l.date}</td>
            <td><button className="btn sm ghost" onClick={e=>{e.stopPropagation();onEdit(l)}}>✏️</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>
}

/* ─── Kanban ──────────────────────────────────────────────────────────────── */
function Kanban({ leads, onEdit }) {
  return <div className="kanban">
    {STATUS_ORDER.filter(s=>s!=='lost').map(s=>{
      const cards = leads.filter(l => l.status === s)
      return <div key={s} className="kcol">
        <div className="khdr">{STATUS_LABELS[s]}<span style={{fontSize:11,background:'var(--bg)',borderRadius:10,padding:'1px 7px',fontWeight:400}}>{cards.length}</span></div>
        <div className="kcnt">
          {cards.map(l=><div key={l.id} className="kcard" onClick={()=>onEdit(l)}>
            <div className="kname">{l.name}</div>
            <div style={{color:'var(--muted)',fontSize:11}}>{l.city} · {l.source}</div>
            {l.fb_msg && <div className="fb-tag">📘 פייסבוק</div>}
            <div className="kmeta">
              <span style={{fontWeight:500,fontSize:12}}>₪{Math.round((l.budget||0)/1000)}K</span>
              <PrioBadge p={l.priority}/>
            </div>
          </div>)}
        </div>
      </div>
    })}
  </div>
}

/* ─── Facebook Inbox ──────────────────────────────────────────────────────── */
const FB_SEED = [
  { id:'fb1', from:'רחל גולן', msg:'שלום, ראיתי את העמוד שלכם ומחפשת מטבח חדש לבית.', time:'לפני 5 דקות', imported:false },
  { id:'fb2', from:'דוד שמואלי', msg:'היי! כמה עולה מטבח ממוצע? יש לי תקציב של כ-70,000 ₪', time:'לפני 12 דקות', imported:false },
]

function FacebookInbox({ onImport }) {
  const [msgs, setMsgs] = useState(FB_SEED)
  const [sim, setSim] = useState(false)
  function simulateNew() {
    setSim(true)
    setTimeout(()=>{
      setMsgs(prev=>[{
        id:`fb${Date.now()}`, time:'כרגע', imported:false,
        from:`לקוח פייסבוק ${Math.floor(Math.random()*900+100)}`,
        msg:`שלום! ראיתי את הפוסט שלכם. אני מחפש${Math.random()>.5?'ת':''} מטבח ל${['בית פרטי','דירה','דופלקס'][Math.floor(Math.random()*3)]}. תוכלו ליצור קשר?`,
      },...prev])
      setSim(false)
    },1200)
  }
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
      <div>
        <div style={{fontWeight:600,fontSize:15}}>📘 הודעות פייסבוק</div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>הודעות נכנסות מהעמוד העסקי</div>
      </div>
      <button className="btn sm" onClick={simulateNew} disabled={sim}>{sim?<span className="spinner"/>:'+ סמלץ הודעה חדשה'}</button>
    </div>
    <div className="fb-inbox">
      {msgs.map(m=><div key={m.id} className="fb-card">
        <div className="fb-header">
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:'var(--blue-light)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:500,fontSize:14,color:'var(--blue)',flexShrink:0}}>{m.from[0]}</div>
            <div><div className="fb-sender">{m.from}</div><div className="fb-time">{m.time}</div></div>
          </div>
          {m.imported && <span className="imported-tag">✓ נוסף ל-CRM</span>}
        </div>
        <div className="fb-text">{m.msg}</div>
        {!m.imported && <div style={{display:'flex',gap:8}}>
          <button className="btn sm primary" onClick={()=>{onImport(m);setMsgs(prev=>prev.map(x=>x.id===m.id?{...x,imported:true}:x))}}>הוסף ל-CRM</button>
          <button className="btn sm" onClick={()=>setMsgs(prev=>prev.map(x=>x.id===m.id?{...x,imported:true}:x))}>התעלם</button>
        </div>}
      </div>)}
    </div>
  </div>
}

/* ─── AI Center ───────────────────────────────────────────────────────────── */
function AICenter({ leads }) {
  const [tab, setTab] = useState('analyze')
  const [selId, setSelId] = useState(leads[0]?.id||null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatMsgs, setChatMsgs] = useState([{role:'ai',text:'שלום! אני העוזר ה-AI של מערכת CRM המטבחים. אוכל לנתח לידים, לתת המלצות אסטרטגיות, ולעזור לכם לסגור יותר עסקאות. במה אוכל לעזור?'}])
  const [chatInput, setChatInput] = useState('')
  const chatRef = useRef(null)
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight },[chatMsgs])

  const hasApiKey = !!import.meta.env.VITE_CLAUDE_API_KEY

  async function analyzeLead() {
    const lead = leads.find(l=>l.id===selId); if(!lead) return
    setLoading(true); setResult('')
    const r = await callClaude([{role:'user',content:`נתח את הליד הבא:\nשם: ${lead.name} | עיר: ${lead.city} | תקציב: ₪${(lead.budget||0).toLocaleString()} | שלב: ${STATUS_LABELS[lead.status]} | עדיפות: ${lead.priority} | מקור: ${lead.source} | הערות: ${lead.notes||'אין'}\nתן: 1) פוטנציאל (1-10) 2) צעד הבא 3) סיכון 4) טיפ לסגירה`}])
    setResult(r); setLoading(false)
  }

  async function weeklySummary() {
    setLoading(true); setResult('')
    const r = await callClaude([{role:'user',content:`סיכום שבועי לצוות: ${STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(' | ')}. פוטנציאל: ₪${leads.reduce((s,l)=>s+(l.budget||0),0).toLocaleString()}. כלול הישגים, אתגרים, ו-3 המלצות לשבוע הבא.`}])
    setResult(r); setLoading(false)
  }

  async function sendChat() {
    if(!chatInput.trim()) return
    const msg = chatInput; setChatInput('')
    setChatMsgs(prev=>[...prev,{role:'user',text:msg}])
    setLoading(true)
    const ctx = `מערכת: ${leads.length} לידים. ${STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(', ')}.`
    const history = chatMsgs.map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}))
    const r = await callClaude([...history,{role:'user',content:`${ctx}\n${msg}`}])
    setChatMsgs(prev=>[...prev,{role:'ai',text:r}])
    setLoading(false)
  }

  if(!hasApiKey) return <div className="card" style={{color:'var(--muted)',fontSize:13,lineHeight:1.7}}>
    <div style={{fontWeight:500,marginBottom:8,fontSize:14,color:'var(--text)'}}>🤖 AI Center</div>
    כדי להפעיל את תכונות ה-AI, יש להוסיף את <code>VITE_CLAUDE_API_KEY</code> בקובץ <code>.env.local</code>.<br/>
    ניתן לקבל מפתח API ב-<a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>console.anthropic.com</a>
  </div>

  return <div>
    <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--muted)',marginBottom:16}}>
      🤖 מרכז ה-AI מחובר ל-Claude ומנתח את הנתונים בזמן אמת
    </div>
    <div className="ai-tabs">
      {[['analyze','ניתוח ליד'],['weekly','סיכום שבועי'],['chat',"צ'אט חופשי"]].map(([v,l])=>
        <button key={v} className={`ai-tab${tab===v?' active':''}`} onClick={()=>{setTab(v);setResult('')}}>{l}</button>
      )}
    </div>
    {tab==='analyze' && <div className="ai-box">
      <select className="lead-sel" value={selId||''} onChange={e=>setSelId(e.target.value)}>
        {leads.map(l=><option key={l.id} value={l.id}>{l.name} — {STATUS_LABELS[l.status]} — ₪{(l.budget||0).toLocaleString()}</option>)}
      </select>
      <button className="btn primary" style={{marginTop:12}} onClick={analyzeLead} disabled={loading||!selId}>{loading?<span className="spinner"/>:'נתח ליד →'}</button>
      {result && <div className="ai-result">{result}</div>}
    </div>}
    {tab==='weekly' && <div className="ai-box">
      <p style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>קבל סיכום שבועי אוטומטי עם תובנות</p>
      <button className="btn primary" onClick={weeklySummary} disabled={loading}>{loading?<span className="spinner"/>:'צור סיכום שבועי →'}</button>
      {result && <div className="ai-result">{result}</div>}
    </div>}
    {tab==='chat' && <div className="ai-box">
      <div className="chat-messages" ref={chatRef}>
        {chatMsgs.map((m,i)=><div key={i} className={`chat-msg ${m.role==='user'?'user':'ai'}`}>
          <div className="chat-bubble">{m.text}</div>
        </div>)}
        {loading && <div className="chat-msg ai"><div className="chat-bubble"><span className="spinner"/></div></div>}
      </div>
      <div className="chat-input-row">
        <input className="chat-input" placeholder="שאל שאלה על הלידים..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()}/>
        <button className="btn primary" onClick={sendChat} disabled={loading||!chatInput.trim()}>שלח</button>
      </div>
    </div>}
  </div>
}

/* ─── Reports ─────────────────────────────────────────────────────────────── */
function Reports({ leads }) {
  const bySource = leads.reduce((acc,l)=>{acc[l.source]=(acc[l.source]||0)+1;return acc},{})
  const sorted = Object.entries(bySource).sort((a,b)=>b[1]-a[1])
  const maxS = sorted[0]?.[1]||1
  const byPrio = {גבוהה:0,בינונית:0,נמוכה:0}; leads.forEach(l=>byPrio[l.priority]++)
  const totalBudget = leads.filter(l=>l.status!=='lost').reduce((s,l)=>s+(l.budget||0),0)
  return <>
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">פוטנציאל צבר</div><div className="kpi-val">₪{Math.round(totalBudget/1000)}K</div></div>
      <div className="kpi"><div className="kpi-label">אחוז סגירה</div><div className="kpi-val">{leads.length?Math.round(leads.filter(l=>l.status==='closed').length/leads.length*100):0}%</div></div>
      <div className="kpi"><div className="kpi-label">ממוצע תקציב</div><div className="kpi-val">₪{leads.length?Math.round(leads.reduce((s,l)=>s+(l.budget||0),0)/leads.length/1000):0}K</div></div>
      <div className="kpi"><div className="kpi-label">לידי פייסבוק</div><div className="kpi-val">{leads.filter(l=>l.source==='פייסבוק').length}</div></div>
    </div>
    <div className="reports-grid">
      <div className="card">
        <div className="card-title">לידים לפי מקור</div>
        {sorted.map(([src,cnt])=><div key={src} className="funnel-row">
          <div className="funnel-top"><span>{src}</span><span>{cnt}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(cnt/maxS*100)}%`}}/></div>
        </div>)}
      </div>
      <div className="card">
        <div className="card-title">תקציב לפי שלב</div>
        {STATUS_ORDER.map(s=>{
          const b = leads.filter(l=>l.status===s).reduce((a,l)=>a+(l.budget||0),0)
          return b>0?<div key={s} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'6px 0',borderBottom:'0.5px solid var(--border)'}}>
            <span style={{color:'var(--muted)'}}>{STATUS_LABELS[s]}</span>
            <span style={{fontWeight:500}}>₪{Math.round(b/1000)}K</span>
          </div>:null
        })}
      </div>
    </div>
  </>
}

/* ─── Lead Modal ──────────────────────────────────────────────────────────── */
const EMPTY = { name:'', phone:'', email:'', city:'', budget:'', source:'אתר אינטרנט', priority:'בינונית', status:'new', notes:'', assigned:'', fb_msg:null }

function LeadModal({ lead, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(lead ? {...lead, budget:String(lead.budget||'')} : EMPTY)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  function submit() {
    if(!form.name.trim()) return alert('נא להזין שם')
    onSave({...form, budget:parseInt(form.budget)||0, date:form.date||new Date().toISOString().slice(0,10)})
  }
  return <div className="modal-bg" onClick={e=>e.target.className==='modal-bg'&&onClose()}>
    <div className="modal">
      <div className="modal-title">{lead?'עריכת ליד':'ליד חדש'}</div>
      {form.fb_msg && <div style={{background:'var(--blue-light)',borderRadius:8,padding:'10px 14px',fontSize:13,marginBottom:16,color:'#0C447C'}}>📘 הודעת פייסבוק: {form.fb_msg}</div>}
      <div className="fgrid">
        {[['name','שם מלא','text'],['phone','טלפון','tel'],['email','אימייל','email'],['city','עיר','text'],['budget','תקציב (₪)','number'],['assigned','נציג אחראי','text']].map(([k,l,t])=>
          <div key={k} className="ffield"><label className="flabel">{l}</label><input className="finput" type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder={l}/></div>
        )}
        {[['source','מקור',['אתר אינטרנט','המלצה','פייסבוק','אינסטגרם','יד2','Google','אחר']],
          ['priority','עדיפות',['גבוהה','בינונית','נמוכה']],
          ['status','שלב',STATUS_ORDER]].map(([k,l,opts])=>
          <div key={k} className="ffield"><label className="flabel">{l}</label>
            <select className="finput" value={form[k]} onChange={e=>set(k,e.target.value)}>
              {opts.map(o=><option key={o} value={o}>{k==='status'?STATUS_LABELS[o]:o}</option>)}
            </select>
          </div>
        )}
        <div className="ffield full"><label className="flabel">הערות</label>
          <textarea className="finput" rows={3} value={form.notes||''} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={submit}>שמור</button>
        <button className="btn" onClick={onClose}>ביטול</button>
        {lead && <button className="btn danger" style={{marginRight:'auto'}} onClick={()=>{if(window.confirm('למחוק ליד זה?'))onDelete(lead.id)}}>מחק</button>}
      </div>
    </div>
  </div>
}

function FbImportModal({ msg, onSave, onClose }) {
  const [form, setForm] = useState({ name:msg.from, phone:'', email:'', city:'', budget:'', source:'פייסבוק', priority:'בינונית', status:'new', notes:msg.msg, assigned:'', fb_msg:msg.msg })
  const set = (k,v)=>setForm(f=>({...f,[k]:v}))
  return <div className="modal-bg" onClick={e=>e.target.className==='modal-bg'&&onClose()}>
    <div className="modal">
      <div className="modal-title">📘 ייבוא ליד מפייסבוק</div>
      <div style={{background:'var(--blue-light)',borderRadius:8,padding:'12px 14px',fontSize:13,marginBottom:18,color:'#0C447C'}}><strong>{msg.from}:</strong> {msg.msg}</div>
      <div className="fgrid">
        {[['name','שם','text'],['phone','טלפון','tel'],['city','עיר','text'],['budget','תקציב משוער (₪)','number']].map(([k,l,t])=>
          <div key={k} className="ffield"><label className="flabel">{l}</label><input className="finput" type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder={l}/></div>
        )}
        {[['priority','עדיפות',['גבוהה','בינונית','נמוכה']],['assigned','נציג',['','יוסי כ.','רותי מ.']]].map(([k,l,opts])=>
          <div key={k} className="ffield"><label className="flabel">{l}</label>
            <select className="finput" value={form[k]} onChange={e=>set(k,e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={()=>{if(!form.name.trim())return alert('נא להזין שם');onSave({...form,budget:parseInt(form.budget)||0,date:new Date().toISOString().slice(0,10)})}}>הוסף ל-CRM</button>
        <button className="btn" onClick={onClose}>ביטול</button>
      </div>
    </div>
  </div>
}

/* ─── Main App ────────────────────────────────────────────────────────────── */
const PAGES = [
  ['dashboard','📊','לוח בקרה'],
  ['leads','👥','לידים'],
  ['kanban','📋','קנבן'],
  ['facebook','📘','פייסבוק'],
  ['ai','🤖','AI Center'],
  ['reports','📈','דוחות'],
]

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [modal, setModal] = useState(null)
  const [fbLead, setFbLead] = useState(null)
  const [saving, setSaving] = useState(false)
  const nextId = useRef(100)

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load leads from Supabase
  useEffect(() => {
    if (!session) return
    loadLeads()
    // Real-time subscription
    const channel = supabase.channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadLeads())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  async function loadLeads() {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (!error && data) { setLeads(data); nextId.current = Math.max(...data.map(l=>l.id||0), 100) + 1 }
    setLeadsLoading(false)
  }

  async function addLead(form) {
    setSaving(true)
    const { error } = await supabase.from('leads').insert([form])
    if (error) alert('שגיאה בשמירה: ' + error.message)
    setSaving(false); setModal(null); loadLeads()
  }

  async function updateLead(form) {
    setSaving(true)
    const { error } = await supabase.from('leads').update(form).eq('id', form.id)
    if (error) alert('שגיאה בעדכון: ' + error.message)
    setSaving(false); setModal(null); loadLeads()
  }

  async function deleteLead(id) {
    setSaving(true)
    await supabase.from('leads').delete().eq('id', id)
    setSaving(false); setModal(null); loadLeads()
  }

  function importFb(form) { addLead(form); setFbLead(null) }

  async function signOut() { await supabase.auth.signOut() }

  if (authLoading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:"'Heebo',sans-serif",color:'#666'}}>טוען...</div>
  if (!session) return <Auth />

  const userEmail = session.user.email

  return <>
    <style>{globalCSS}</style>
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          <h1>🏠 מטבחי CRM</h1>
          <p>{leads.length} לידים · {saving ? 'שומר...' : 'מסונכרן'}</p>
        </div>
        <div className="nav">
          {PAGES.map(([id,icon,label])=><div key={id} className={`nav-item${page===id?' active':''}`} onClick={()=>setPage(id)}>
            <span>{icon}</span>{label}
          </div>)}
        </div>
        <div className="sidebar-footer">
          <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{userEmail}</span>
          <button className="btn sm ghost" onClick={signOut} style={{color:'var(--red)'}}>יציאה</button>
        </div>
      </div>
      <div className="main">
        <div className="save-bar"><div className="sync-dot"/><span>שמירה בענן · {saving?'שומר...':'מסונכרן לכל המשתמשים'}</span></div>
        <div className="topbar">
          <h2>{PAGES.find(p=>p[0]===page)?.[2]}</h2>
          <button className="btn primary" onClick={()=>setModal('new')}>+ ליד חדש</button>
        </div>
        <div className="content">
          {leadsLoading ? <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>טוען לידים...</div> : <>
            {page==='dashboard' && <Dashboard leads={leads}/>}
            {page==='leads' && <LeadsTable leads={leads} onEdit={l=>setModal({type:'edit',lead:l})}/>}
            {page==='kanban' && <Kanban leads={leads} onEdit={l=>setModal({type:'edit',lead:l})}/>}
            {page==='facebook' && <FacebookInbox onImport={msg=>setFbLead(msg)}/>}
            {page==='ai' && <AICenter leads={leads}/>}
            {page==='reports' && <Reports leads={leads}/>}
          </>}
        </div>
      </div>
    </div>
    {modal==='new' && <LeadModal onSave={addLead} onClose={()=>setModal(null)}/>}
    {modal?.type==='edit' && <LeadModal lead={modal.lead} onSave={updateLead} onDelete={deleteLead} onClose={()=>setModal(null)}/>}
    {fbLead && <FbImportModal msg={fbLead} onSave={importFb} onClose={()=>setFbLead(null)}/>}
  </>
}

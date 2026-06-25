import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'

const STATUS_LABELS = { new:'ליד חדש', contact:'יצירת קשר', design:'תכנון מטבח', offer:'הצעת מחיר', closed:'סגירה', lost:'אבוד' }
const STATUS_ORDER = ['new','contact','design','offer','closed','lost']
const STATUS_COLORS = { new:'#185FA5', contact:'#854F0B', design:'#27500A', offer:'#3C3489', closed:'#177a3c', lost:'#791F1F' }
const STATUS_BG = { new:'#E6F1FB', contact:'#FAEEDA', design:'#EAF3DE', offer:'#EEEDFE', closed:'#EAF3DE', lost:'#FCEBEB' }

const REGIONS = {
  'צפון': ['טבריה','עכו','חיפה','נהריה','קריות','נצרת','עפולה','צפת','כרמיאל'],
  'מרכז': ['תל אביב','רמת גן','פתח תקווה','בני ברק','גבעתיים','חולון','בת ים','ראשון לציון','כפר סבא','הרצליה','ראש העין','לוד','רמלה'],
  'שרון': ['נתניה','הרצליה','רעננה','כפר סבא','הוד השרון'],
  'שפלה': ['רחובות','נס ציונה','יבנה','אשדוד','קריית גת'],
  'ירושלים': ['ירושלים','בית שמש','מעלה אדומים'],
  'דרום': ['באר שבע','אשקלון','אשדוד','דימונה','נתיבות','שדרות'],
}
function getRegion(city) {
  for (const [r, cities] of Object.entries(REGIONS)) {
    if (cities.some(c => city?.includes(c) || c.includes(city||''))) return r
  }
  return 'מרכז'
}

const fmt = n => n ? '₪' + Number(n).toLocaleString() : '—'
const daysSince = d => Math.floor((new Date() - new Date(d)) / 864e5)
const kitchenEmoji = color => {
  if (!color) return '🪵'
  const c = color.toLowerCase()
  return c.includes('לבן')||c.includes('שמנת') ? '⬜' : c.includes('שחור')||c.includes('אנתרציט') ? '⬛' : c.includes('אפור') ? '🔲' : c.includes('ירוק') ? '🟩' : '🟫'
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{font-family:'Heebo',sans-serif;direction:rtl;background:#f5f4f0;color:#1a1a1a}
:root{
  --bg:#f5f4f0;--surface:#fff;--surface2:#f0efeb;
  --border:rgba(0,0,0,.09);--border2:rgba(0,0,0,.14);
  --text:#1a1a1a;--muted:#666;--faint:#999;
  --blue:#185FA5;--blue-dim:#E6F1FB;
  --green:#3B6D11;--green-dim:#EAF3DE;
  --amber:#854F0B;--amber-dim:#FAEEDA;
  --red:#A32D2D;--red-dim:#FCEBEB;
  --radius:10px;--radius-sm:7px;
}
.app{display:flex;height:100vh;overflow:hidden}
.sidebar{width:210px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0}
.logo{padding:18px 16px 14px;border-bottom:1px solid var(--border)}
.logo h1{font-size:14px;font-weight:600}
.logo p{font-size:11px;color:var(--muted);margin-top:3px}
.nav{flex:1;padding:8px;overflow-y:auto}
.nav-sec{font-size:10px;color:var(--faint);font-weight:600;padding:10px 8px 4px;text-transform:uppercase;letter-spacing:.07em}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;cursor:pointer;font-size:13px;color:var(--muted);border-radius:var(--radius-sm);margin-bottom:1px;transition:all .13s}
.nav-item:hover{background:var(--surface2);color:var(--text)}
.nav-item.active{background:var(--blue-dim);color:var(--blue);font-weight:500}
.nav-badge{background:#E24B4A;color:#fff;font-size:9px;padding:1px 6px;border-radius:8px;margin-right:auto;font-weight:600}
.nav-badge.blue{background:var(--blue)}
.sidebar-footer{padding:12px 14px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.sync-bar{background:var(--surface2);border-bottom:1px solid var(--border);padding:4px 20px;font-size:11px;color:var(--faint);display:flex;align-items:center;gap:6px}
.sync-dot{width:6px;height:6px;border-radius:50%;background:var(--green)}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0}
.page-title{font-size:15px;font-weight:600}
.content{flex:1;padding:18px 20px;overflow-y:auto}
button{font-family:inherit;cursor:pointer}
.btn{padding:7px 15px;font-size:12px;font-weight:500;border:1px solid var(--border2);border-radius:var(--radius-sm);background:transparent;color:var(--text);transition:all .13s;display:inline-flex;align-items:center;gap:5px}
.btn:hover{background:var(--surface2)}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn.primary{background:var(--blue);color:#fff;border-color:var(--blue)}.btn.primary:hover{background:#0C447C}
.btn.ghost{border-color:transparent;color:var(--muted)}.btn.ghost:hover{background:var(--surface2);color:var(--text)}
.btn.danger{color:var(--red);border-color:transparent}.btn.danger:hover{background:var(--red-dim)}
.btn.sm{padding:4px 10px;font-size:11px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:15px 16px;border-right:3px solid var(--border2)}
.kpi.blue{border-right-color:var(--blue)}.kpi.green{border-right-color:var(--green)}
.kpi.amber{border-right-color:var(--amber)}.kpi.purple{border-right-color:#534AB7}
.kpi-label{font-size:10px;color:var(--muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;font-weight:500}
.kpi-val{font-size:22px;font-weight:600}
.dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.card-title{font-size:10px;font-weight:600;color:var(--muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em}
.funnel-row{margin-bottom:8px}
.funnel-top{display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;color:var(--muted)}
.funnel-track{height:5px;background:var(--surface2);border-radius:3px;overflow:hidden}
.funnel-fill{height:100%;border-radius:3px;transition:width .4s}
.toolbar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}
.search{padding:7px 13px;font-size:12px;border:1px solid var(--border2);border-radius:20px;background:var(--surface);color:var(--text);direction:rtl;font-family:inherit;width:190px}
.search:focus{outline:none;border-color:var(--blue)}
.chip{padding:4px 12px;font-size:11px;border:1px solid var(--border);border-radius:20px;cursor:pointer;background:transparent;color:var(--muted);font-family:inherit;transition:all .13s}
.chip:hover{border-color:var(--blue);color:var(--blue)}
.chip.active{background:var(--text);border-color:var(--text);color:#fff;font-weight:500}
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
thead{background:var(--surface2)}
th{padding:9px 12px;text-align:right;font-weight:600;font-size:10px;color:var(--muted);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--surface2);cursor:pointer}
.sbadge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
.s-new{background:#E6F1FB;color:#0C447C}.s-contact{background:#FAEEDA;color:#633806}
.s-design{background:#EAF3DE;color:#27500A}.s-offer{background:#EEEDFE;color:#3C3489}
.s-closed{background:#EAF3DE;color:#177a3c}.s-lost{background:#FCEBEB;color:#791F1F}
.ph{color:var(--red);font-size:11px;font-weight:600}.pm{color:var(--amber);font-size:11px;font-weight:600}.pl{color:var(--green);font-size:11px;font-weight:600}
.sup-y{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:var(--green-dim);color:var(--green)}
.sup-n{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:var(--red-dim);color:var(--red)}
.age-old{color:var(--red);font-weight:600;font-size:10px}.age-mid{color:var(--amber);font-weight:600;font-size:10px}.age-new{color:var(--green);font-weight:600;font-size:10px}
.sketch-thumb{width:32px;height:32px;border-radius:4px;object-fit:cover;border:1px solid var(--border);cursor:pointer;display:block}
.sketch-icon{width:32px;height:32px;border-radius:4px;border:1px dashed var(--border2);display:inline-flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;color:var(--muted);background:transparent;border:none;padding:0}
.sketch-icon:hover{background:var(--surface2)}
.inv-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:14px}
.inv-tab{padding:9px 16px;font-size:13px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;font-weight:500}
.inv-tab.active{color:var(--blue);border-bottom-color:var(--blue)}
.inv-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
.inv-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;position:relative}
.inv-card.low{border-color:#E24B4A;background:var(--red-dim)}
.low-badge{position:absolute;top:10px;left:10px;background:#E24B4A;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px}
.inv-actions{display:flex;gap:5px;margin-top:8px}
.inv-btn{padding:3px 11px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-sm);background:transparent;color:var(--text);cursor:pointer;font-family:inherit}
.inv-btn:hover{background:var(--surface2)}
.ck-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;gap:12px;align-items:flex-start;margin-bottom:10px}
.ck-status{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
.cks-wait{background:var(--amber-dim);color:var(--amber)}.cks-ready{background:var(--green-dim);color:var(--green)}.cks-delivered{background:var(--blue-dim);color:var(--blue)}
.delivery-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;gap:12px;align-items:flex-start;margin-bottom:10px}
.d-status{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
.ds-wait{background:var(--amber-dim);color:var(--amber)}.ds-go{background:var(--blue-dim);color:var(--blue)}.ds-done{background:var(--green-dim);color:var(--green)}
.move-btn{padding:2px 8px;font-size:13px;border:1px solid var(--border);border-radius:4px;background:transparent;cursor:pointer;color:var(--muted);line-height:1.5}
.move-btn:hover{background:var(--surface2)}
.kanban{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;align-items:flex-start}
.kcol{min-width:200px;flex:1}
.khdr{padding:9px 12px;font-size:10px;font-weight:700;display:flex;justify-content:space-between;align-items:center;border-radius:var(--radius-sm) var(--radius-sm) 0 0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.kcnt{display:flex;flex-direction:column;gap:8px;min-height:60px}
.kcard{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;cursor:pointer}
.kcard:hover{border-color:var(--border2)}
.ai-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:16px}
.ai-tab{padding:9px 18px;font-size:13px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;font-weight:500}
.ai-tab.active{color:var(--blue);border-bottom-color:var(--blue)}
.ai-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.ai-result{margin-top:14px;padding:14px;background:var(--surface2);border-radius:var(--radius-sm);font-size:13px;line-height:1.85;white-space:pre-wrap}
.chat-messages{display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto}
.chat-msg{display:flex;gap:8px}
.chat-msg.user{flex-direction:row-reverse}
.chat-bubble{padding:10px 14px;border-radius:var(--radius);font-size:13px;line-height:1.6;max-width:80%}
.chat-msg.ai .chat-bubble{background:var(--surface2);border:1px solid var(--border)}
.chat-msg.user .chat-bubble{background:var(--blue);color:#fff}
.chat-input-row{display:flex;gap:8px;margin-top:12px}
.chat-input{flex:1;padding:9px 13px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2);color:var(--text);direction:rtl;font-family:inherit}
.chat-input:focus{outline:none;border-color:var(--blue)}
.lead-sel{padding:8px 12px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2);color:var(--text);direction:rtl;font-family:inherit;width:100%}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;z-index:300;padding:20px;overflow-y:auto}
.modal{background:var(--surface);border-radius:14px;width:660px;max-width:96vw;padding:26px 28px;direction:rtl;margin:auto}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.modal-title{font-size:16px;font-weight:600}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:2px 6px;border-radius:4px}
.modal-close:hover{background:var(--surface2)}
.form-sec{margin-bottom:16px}
.sec-title{font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--border)}
.fgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.fgrid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ffield{display:flex;flex-direction:column;gap:4px}
.ffield.span2{grid-column:span 2}.ffield.full{grid-column:1/-1}
.flabel{font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.finput{padding:7px 10px;font-size:12px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2);color:var(--text);direction:rtl;font-family:inherit;width:100%}
.finput:focus{outline:none;border-color:var(--blue);background:var(--surface)}
.modal-foot{display:flex;gap:8px;padding-top:16px;border-top:1px solid var(--border);align-items:center}
.toggle{position:relative;width:38px;height:20px;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0}
.slider{position:absolute;cursor:pointer;inset:0;background:var(--surface2);border:1px solid var(--border2);border-radius:20px;transition:.2s}
.slider:before{position:absolute;content:'';height:14px;width:14px;right:2px;top:2px;background:var(--muted);border-radius:50%;transition:.2s}
input:checked+.slider{background:var(--green);border-color:var(--green)}
input:checked+.slider:before{background:#fff;transform:translateX(-18px)}
.sketch-upload{border:2px dashed var(--border2);border-radius:var(--radius);padding:20px;text-align:center;cursor:pointer;transition:all .13s}
.sketch-upload:hover{border-color:var(--blue);background:var(--surface2)}
.sketch-preview{max-width:100%;max-height:200px;border-radius:var(--radius-sm);object-fit:contain;margin-top:8px}
.spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(0,0,0,.1);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.reports-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.lb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:500;cursor:pointer}
.lb-img{max-width:92vw;max-height:88vh;border-radius:8px;object-fit:contain}
`

async function callClaude(messages) {
  const key = import.meta.env.VITE_CLAUDE_API_KEY || ''
  if (!key) return '⚠️ יש להגדיר VITE_CLAUDE_API_KEY'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'אתה עוזר CRM חכם לחברת מטבחים ישראלית. ענה בעברית, בצורה קצרה ומקצועית.',messages})
  })
  const d = await res.json()
  return d.content?.find(b=>b.type==='text')?.text||''
}

function SBadge({s}){const cls={new:'s-new',contact:'s-contact',design:'s-design',offer:'s-offer',closed:'s-closed',lost:'s-lost'};return <span className={`sbadge ${cls[s]||'s-new'}`}>{STATUS_LABELS[s]}</span>}
function PBadge({p}){return <span className={p==='גבוהה'?'ph':p==='נמוכה'?'pl':'pm'}>{p}</span>}
function AgeLabel({date}){if(!date)return null;const n=daysSince(date);if(n<=1)return <span className="age-new">{n===0?'היום':'אתמול'}</span>;if(n<=7)return <span className="age-new">לפני {n}י׳</span>;if(n<=30)return <span className="age-mid">לפני {n}י׳</span>;return <span className="age-old">לפני {n}י׳</span>}
function SupBadge({v}){return v?<span className="sup-y">✓ סופק</span>:<span className="sup-n">✗ ממתין</span>}
function CKBadge({s}){return s==='wait'?<span className="ck-status cks-wait">בייצור</span>:s==='ready'?<span className="ck-status cks-ready">מוכן</span>:<span className="ck-status cks-delivered">נמסר</span>}
function DBadge({s}){return s==='wait'?<span className="d-status ds-wait">ממתין</span>:s==='go'?<span className="d-status ds-go">בדרך</span>:<span className="d-status ds-done">נמסר</span>}

function Dashboard({leads,inventory,custKitchens,deliveries}){
  const rev=leads.filter(l=>l.status==='closed').reduce((s,l)=>s+(l.price||0),0)
  const lowItems=inventory.filter(i=>i.qty<=i.min).length
  const pendingDel=deliveries.filter(d=>d.status!=='done').length
  const counts={};STATUS_ORDER.forEach(s=>counts[s]=leads.filter(l=>l.status===s).length)
  const maxC=Math.max(...Object.values(counts),1)
  const oldLeads=[...leads].filter(l=>!['closed','lost'].includes(l.status)).sort((a,b)=>new Date(a.date)-new Date(b.date))
  return <>
    <div className="kpi-grid">
      <div className="kpi blue"><div className="kpi-label">סה"כ לידים</div><div className="kpi-val">{leads.length}</div></div>
      <div className="kpi green"><div className="kpi-label">הכנסות סגורות</div><div className="kpi-val">{fmt(rev)}</div></div>
      <div className={`kpi ${lowItems>0?'amber':'green'}`}><div className="kpi-label" style={lowItems>0?{color:'var(--red)'}:{}}>{lowItems>0?'⚠️ מלאי נמוך':'✓ מלאי תקין'}</div><div className="kpi-val" style={lowItems>0?{color:'var(--red)'}:{}}>{lowItems}</div></div>
      <div className="kpi purple"><div className="kpi-label">הובלות פתוחות</div><div className="kpi-val">{pendingDel}</div></div>
    </div>
    <div className="dash-grid">
      <div className="card">
        <div className="card-title">משפך מכירות</div>
        {STATUS_ORDER.map(s=><div key={s} className="funnel-row">
          <div className="funnel-top"><span>{STATUS_LABELS[s]}</span><span style={{color:'var(--text)',fontWeight:600}}>{counts[s]}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(counts[s]/maxC*100)}%`,background:STATUS_COLORS[s]}}/></div>
        </div>)}
      </div>
      <div className="card">
        <div className="card-title">ישנים ביותר — דורשים טיפול</div>
        {oldLeads.slice(0,6).map(l=><div key={l.id} style={{display:'flex',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:daysSince(l.date)>14?'var(--red)':daysSince(l.date)>7?'var(--amber)':'var(--green)',flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name} — {l.city}</div><div style={{fontSize:10,color:'var(--muted)'}}>{STATUS_LABELS[l.status]}</div></div>
          <AgeLabel date={l.date}/>
        </div>)}
        {!oldLeads.length&&<div style={{fontSize:12,color:'var(--muted)'}}>כל הלידים טופלו ✓</div>}
      </div>
    </div>
  </>
}

function LeadsTable({leads,onEdit,onSketchUpload,onSketchView}){
  const [filter,setFilter]=useState('all')
  const [q,setQ]=useState('')
  const [supF,setSupF]=useState('all')
  const [sortDir,setSortDir]=useState('asc')
  const fileRef=useRef(null)
  const [quickId,setQuickId]=useState(null)
  const list=[...leads].filter(l=>{
    const mq=!q||l.name?.includes(q)||l.city?.includes(q)||l.phone?.includes(q)||l.agent?.includes(q)
    return mq&&(filter==='all'||l.status===filter)&&(supF==='all'||(supF==='yes'&&l.supplied)||(supF==='no'&&!l.supplied))
  }).sort((a,b)=>sortDir==='asc'?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date))
  function handleQuickUpload(e){const file=e.target.files[0];if(!file||!quickId)return;const reader=new FileReader();reader.onload=ev=>{onSketchUpload(quickId,ev.target.result);e.target.value=''};reader.readAsDataURL(file)}
  return <>
    <div className="toolbar">
      <input className="search" placeholder="חיפוש שם, עיר, טלפון, סוכן..." value={q} onChange={e=>setQ(e.target.value)}/>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        {['all',...STATUS_ORDER].map(s=><button key={s} className={`chip${filter===s?' active':''}`} onClick={()=>setFilter(s)}>{s==='all'?'הכל':STATUS_LABELS[s]}</button>)}
      </div>
      <button className={`chip${supF==='all'?' active':''}`} onClick={()=>setSupF('all')}>הכל</button>
      <button className={`chip${supF==='yes'?' active':''}`} onClick={()=>setSupF('yes')}>✓ סופק</button>
      <button className={`chip${supF==='no'?' active':''}`} onClick={()=>setSupF('no')}>✗ ממתין</button>
      <button className={`chip${sortDir==='asc'?' active':''}`} onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>{sortDir==='asc'?'↑ ישן→חדש':'↓ חדש→ישן'}</button>
    </div>
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th style={{width:'4%'}}>שרטוט</th><th style={{width:'15%'}}>לקוח</th><th style={{width:'10%'}}>טלפון</th>
          <th style={{width:'10%'}}>מטבח</th><th style={{width:'8%'}}>מחיר</th><th style={{width:'8%'}}>אספקה</th>
          <th style={{width:'10%'}}>שלב</th><th style={{width:'7%'}}>עדיפות</th><th style={{width:'7%'}}>סוכן</th>
          <th style={{width:'8%'}}>תאריך</th><th style={{width:'7%'}}>ימים</th><th style={{width:'6%'}}></th>
        </tr></thead>
        <tbody>
          {!list.length&&<tr><td colSpan={12} style={{textAlign:'center',color:'var(--muted)',padding:28}}>אין תוצאות</td></tr>}
          {list.map(l=><tr key={l.id} onClick={()=>onEdit(l)}>
            <td onClick={e=>e.stopPropagation()}>
              {l.sketch?<img className="sketch-thumb" src={l.sketch} onClick={()=>onSketchView(l.sketch)} alt="שרטוט"/>
                :<button className="sketch-icon" onClick={()=>{setQuickId(l.id);fileRef.current?.click()}}>🖼️</button>}
            </td>
            <td><div style={{fontWeight:600,fontSize:13}}>{l.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{l.city}{l.address?' · '+l.address:''}</div></td>
            <td style={{color:'var(--muted)',fontSize:11}}>{l.phone||'—'}</td>
            <td><div style={{fontSize:12}}>{l.kitchen_color||'—'}</div><div style={{fontSize:10,color:'var(--muted)'}}>{l.marble_color||''}</div></td>
            <td style={{fontWeight:600,color:'var(--green)'}}>{fmt(l.price)}</td>
            <td><SupBadge v={l.supplied}/></td>
            <td><SBadge s={l.status}/></td>
            <td><PBadge p={l.priority}/></td>
            <td style={{color:'var(--muted)',fontSize:11}}>{l.agent||'—'}</td>
            <td style={{color:'var(--muted)',fontSize:11}}>{l.date||'—'}</td>
            <td>{l.date?<AgeLabel date={l.date}/>:'—'}</td>
            <td><button className="btn sm ghost" onClick={e=>{e.stopPropagation();onEdit(l)}}>✏️</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleQuickUpload}/>
  </>
}

function Kanban({leads,onEdit}){
  return <div className="kanban">
    {STATUS_ORDER.filter(s=>s!=='lost').map(s=>{
      const cards=leads.filter(l=>l.status===s)
      return <div key={s} className="kcol">
        <div className="khdr" style={{background:STATUS_BG[s],color:STATUS_COLORS[s]}}>{STATUS_LABELS[s]}<span style={{background:'rgba(0,0,0,.1)',borderRadius:10,padding:'0 7px',fontWeight:400}}>{cards.length}</span></div>
        <div className="kcnt">
          {cards.map(l=><div key={l.id} className="kcard" onClick={()=>onEdit(l)}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{l.name}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{l.city} · {l.kitchen_color||'—'}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:600,fontSize:12,color:'var(--green)'}}>{fmt(l.price)}</span>
              {l.date&&<AgeLabel date={l.date}/>}
            </div>
          </div>)}
          {!cards.length&&<div style={{fontSize:11,color:'var(--faint)',padding:'10px 0',textAlign:'center'}}>ריק</div>}
        </div>
      </div>
    })}
  </div>
}

function Inventory({inventory,custKitchens,leads,onEditInv,onAdjInv,onEditCK,onCycleCK,onAddPart}){
  const [tab,setTab]=useState('standard')
  const std=inventory.filter(i=>i.category==='מטבחים סטנדרט')
  const parts=inventory.filter(i=>i.category!=='מטבחים סטנדרט')
  const cats=[...new Set(parts.map(i=>i.category))]
  function InvCard({item}){
    const pct=Math.min(100,Math.round(item.qty/Math.max(item.min*2,1)*100))
    const isLow=item.qty<=item.min
    return <div className={`inv-card${isLow?' low':''}`}>
      {isLow&&<div className="low-badge">⚠️ נמוך</div>}
      {item.color&&<div style={{fontSize:22,marginBottom:6}}>{kitchenEmoji(item.color)}</div>}
      <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{item.name}</div>
      {item.color&&<div style={{fontSize:10,color:'var(--muted)',marginBottom:6}}>{item.color} {item.size||''}</div>}
      <div style={{fontSize:22,fontWeight:600}}>{item.qty}<span style={{fontSize:11,color:'var(--muted)'}}> {item.unit}</span></div>
      <div style={{fontSize:10,color:isLow?'var(--red)':'var(--muted)',marginBottom:4}}>מינימום: {item.min} {item.unit}</div>
      <div style={{height:5,background:'var(--surface2)',borderRadius:3,overflow:'hidden',margin:'8px 0'}}><div style={{height:'100%',borderRadius:3,width:`${pct}%`,background:isLow?'#E24B4A':pct>60?'var(--green)':'var(--amber)',transition:'width .3s'}}/></div>
      <div className="inv-actions">
        <button className="inv-btn" onClick={()=>onAdjInv(item.id,1)}>＋</button>
        <button className="inv-btn" onClick={()=>onAdjInv(item.id,-1)}>－</button>
        <button className="inv-btn" onClick={()=>onEditInv(item)}>✏️</button>
      </div>
    </div>
  }
  return <>
    <div className="inv-tabs">
      <button className={`inv-tab${tab==='standard'?' active':''}`} onClick={()=>setTab('standard')}>🏠 מטבחים סטנדרט ({std.length})</button>
      <button className={`inv-tab${tab==='custom'?' active':''}`} onClick={()=>setTab('custom')}>👤 הזמנות מיוחדות ({custKitchens.length})</button>
      <button className={`inv-tab${tab==='parts'?' active':''}`} onClick={()=>setTab('parts')}>🔧 חלקים ({parts.length})</button>
    </div>
    {tab==='standard'&&<>
      <div className="toolbar"><span style={{fontSize:12,color:'var(--muted)'}}>{std.filter(i=>i.qty<=i.min).length} במלאי נמוך</span><div style={{flex:1}}/><button className="btn primary" onClick={()=>onEditInv(null,'standard')}>＋ מטבח חדש</button></div>
      <div className="inv-grid">{std.map(item=><InvCard key={item.id} item={item}/>)}{!std.length&&<div style={{color:'var(--muted)',fontSize:13}}>אין מטבחים סטנדרט</div>}</div>
    </>}
    {tab==='custom'&&<>
      <div className="toolbar"><span style={{fontSize:12,color:'var(--muted)'}}>{custKitchens.filter(c=>c.status==='wait').length} בייצור · {custKitchens.filter(c=>c.status==='ready').length} מוכנים</span><div style={{flex:1}}/><button className="btn primary" onClick={()=>onEditCK(null)}>＋ מטבח בהזמנה</button></div>
      {custKitchens.map(ck=>{const lead=leads.find(l=>l.id===ck.lead_id);return <div key={ck.id} className="ck-card">
        <div style={{width:38,height:38,borderRadius:8,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{kitchenEmoji(ck.color)}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><div style={{fontWeight:600,fontSize:13}}>{ck.name}</div><CKBadge s={ck.status}/></div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>👤 {lead?`${lead.name} — ${lead.city}`:'—'}</div>
          <div style={{fontSize:11,color:'var(--muted)',display:'flex',gap:10,flexWrap:'wrap'}}>
            {ck.size&&<span>📐 {ck.size}</span>}{ck.color&&<span>🎨 {ck.color}</span>}{ck.notes&&<span>💬 {ck.notes}</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
          {ck.status!=='delivered'&&<button className="inv-btn" onClick={()=>onCycleCK(ck.id)}>{ck.status==='wait'?'▶ מוכן':'✓ נמסר'}</button>}
          <button className="btn sm ghost" onClick={()=>onEditCK(ck)}>✏️</button>
        </div>
      </div>})}
      {!custKitchens.length&&<div style={{color:'var(--muted)',fontSize:13}}>אין הזמנות מיוחדות</div>}
    </>}
    {tab==='parts'&&<>
      <div className="toolbar"><span style={{fontSize:12,color:'var(--muted)'}}>{parts.filter(i=>i.qty<=i.min).length} פריטים נמוך</span><div style={{flex:1}}/><button className="btn primary" onClick={onAddPart}>＋ פריט חדש</button></div>
      {cats.map(cat=><div key={cat} style={{marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>{cat}</div>
        <div className="inv-grid">{parts.filter(i=>i.category===cat).map(item=><InvCard key={item.id} item={item}/>)}</div>
      </div>)}
    </>}
  </>
}

function Deliveries({deliveries,leads,onEdit,onCycleStatus,onMoveUp,onMoveDown}){
  const today=deliveries.filter(d=>d.date>=new Date().toISOString().slice(0,10))
  const upcoming=deliveries.filter(d=>d.date<new Date().toISOString().slice(0,10)&&d.status!=='done')
  return <>
    <div className="toolbar"><span style={{fontSize:12,color:'var(--muted)'}}>{deliveries.filter(d=>d.status==='wait').length} ממתינות · {deliveries.filter(d=>d.status==='go').length} בדרך</span><div style={{flex:1}}/><button className="btn primary" onClick={()=>onEdit(null)}>＋ הובלה חדשה</button></div>
    {today.map((d,i)=><div key={d.id} className="delivery-card">
      <div style={{width:30,height:30,borderRadius:'50%',background:'var(--blue-dim)',color:'var(--blue)',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><strong style={{fontSize:13}}>{d.driver}</strong><DBadge s={d.status}/></div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>👤 {d.customer}</div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:4,display:'flex',gap:10,flexWrap:'wrap'}}>
          <span>📍 {d.address}</span>{d.time&&<span>🕐 {d.time}</span>}{d.items&&<span>📦 {d.items}</span>}
        </div>
        {d.notes&&<div style={{fontSize:10,color:'var(--muted)',marginTop:4,background:'var(--surface2)',padding:'3px 8px',borderRadius:4}}>💬 {d.notes}</div>}
      </div>
      <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
        <button className="move-btn" onClick={()=>onMoveUp(d.id)}>↑</button>
        <button className="move-btn" onClick={()=>onMoveDown(d.id)}>↓</button>
        {d.status!=='done'&&<button className="inv-btn" onClick={()=>onCycleStatus(d.id)}>{d.status==='wait'?'▶ שלח':'✓ נמסר'}</button>}
        <button className="btn sm ghost" onClick={()=>onEdit(d)}>✏️</button>
      </div>
    </div>)}
    {!today.length&&<div style={{color:'var(--muted)',fontSize:13,padding:'12px 0'}}>אין הובלות להיום</div>}
    {upcoming.length>0&&<>
      <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',margin:'16px 0 8px'}}>ממתינות</div>
      {upcoming.map((d,i)=><div key={d.id} className="delivery-card" style={{opacity:.7}}>
        <div style={{width:30,height:30,borderRadius:'50%',background:'var(--surface2)',color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,fontSize:13,flexShrink:0}}>{i+1}</div>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{d.driver} — {d.customer}</div><div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{d.address} · {d.date}</div></div>
        <button className="btn sm ghost" onClick={()=>onEdit(d)}>✏️</button>
      </div>)}
    </>}
  </>
}

function AICenter({leads}){
  const [tab,setTab]=useState('analyze')
  const [selId,setSelId]=useState(leads[0]?.id||null)
  const [result,setResult]=useState('')
  const [loading,setLoading]=useState(false)
  const [chatMsgs,setChatMsgs]=useState([{role:'ai',text:'שלום! אני העוזר ה-AI של מערכת CRM. במה אוכל לעזור?'}])
  const [chatInput,setChatInput]=useState('')
  const chatRef=useRef(null)
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight},[chatMsgs])
  const hasKey=!!import.meta.env.VITE_CLAUDE_API_KEY
  async function analyze(){const lead=leads.find(l=>l.id===selId);if(!lead)return;setLoading(true);setResult('');const r=await callClaude([{role:'user',content:`נתח: ${lead.name} | ${lead.city} | ${fmt(lead.price)} | ${STATUS_LABELS[lead.status]} | ${lead.kitchen_color||''} | סוכן: ${lead.agent||'—'}\nתן: 1) פוטנציאל 2) צעד הבא 3) סיכון 4) טיפ`}]);setResult(r);setLoading(false)}
  async function weekly(){setLoading(true);setResult('');const r=await callClaude([{role:'user',content:`סיכום שבועי: ${STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(' | ')}. הכנסות: ${fmt(leads.filter(l=>l.status==='closed').reduce((s,l)=>s+(l.price||0),0))}. תן הישגים, אתגרים, 3 המלצות.`}]);setResult(r);setLoading(false)}
  async function sendChat(){if(!chatInput.trim())return;const msg=chatInput;setChatInput('');setChatMsgs(prev=>[...prev,{role:'user',text:msg}]);setLoading(true);const h=chatMsgs.map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}));const r=await callClaude([...h,{role:'user',content:`${STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(', ')}.\n${msg}`}]);setChatMsgs(prev=>[...prev,{role:'ai',text:r}]);setLoading(false)}
  if(!hasKey)return <div className="card" style={{fontSize:13,color:'var(--muted)',lineHeight:1.7}}><div style={{fontWeight:600,marginBottom:8,fontSize:14,color:'var(--text)'}}>🤖 AI Center</div>יש להגדיר <code>VITE_CLAUDE_API_KEY</code> ב-Vercel → Environment Variables.</div>
  return <div>
    <div className="ai-tabs">
      {[['analyze','🔍 ניתוח ליד'],['weekly','📊 סיכום שבועי'],['chat',"💬 צ'אט"]].map(([v,l])=>
        <button key={v} className={`ai-tab${tab===v?' active':''}`} onClick={()=>{setTab(v);setResult('')}}>{l}</button>)}
    </div>
    {tab==='analyze'&&<div className="ai-box">
      <select className="lead-sel" value={selId||''} onChange={e=>setSelId(e.target.value)}>{leads.map(l=><option key={l.id} value={l.id}>{l.name} — {STATUS_LABELS[l.status]} — {fmt(l.price)}</option>)}</select>
      <button className="btn primary" style={{marginTop:12}} onClick={analyze} disabled={loading||!selId}>{loading?<span className="spinner"/>:'נתח →'}</button>
      {result&&<div className="ai-result">{result}</div>}
    </div>}
    {tab==='weekly'&&<div className="ai-box">
      <p style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>קבל סיכום שבועי אוטומטי</p>
      <button className="btn primary" onClick={weekly} disabled={loading}>{loading?<span className="spinner"/>:'צור סיכום →'}</button>
      {result&&<div className="ai-result">{result}</div>}
    </div>}
    {tab==='chat'&&<div className="ai-box">
      <div className="chat-messages" ref={chatRef}>
        {chatMsgs.map((m,i)=><div key={i} className={`chat-msg ${m.role==='user'?'user':'ai'}`}><div className="chat-bubble">{m.text}</div></div>)}
        {loading&&<div className="chat-msg ai"><div className="chat-bubble"><span className="spinner"/></div></div>}
      </div>
      <div className="chat-input-row">
        <input className="chat-input" placeholder="שאל שאלה..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()}/>
        <button className="btn primary" onClick={sendChat} disabled={loading||!chatInput.trim()}>שלח</button>
      </div>
    </div>}
  </div>
}

function Reports({leads}){
  const bySource=leads.reduce((acc,l)=>{acc[l.source||'אחר']=(acc[l.source||'אחר']||0)+1;return acc},{})
  const byAgent=leads.reduce((acc,l)=>{if(l.agent){acc[l.agent]=acc[l.agent]||{c:0,r:0};acc[l.agent].c++;if(l.status==='closed')acc[l.agent].r+=(l.price||0)}return acc},{})
  const sortedS=Object.entries(bySource).sort((a,b)=>b[1]-a[1])
  const sortedA=Object.entries(byAgent).sort((a,b)=>b[1].c-a[1].c)
  const maxS=sortedS[0]?.[1]||1,maxA=sortedA[0]?.[1].c||1
  const rev=leads.filter(l=>l.status==='closed').reduce((s,l)=>s+(l.price||0),0)
  const dep=leads.reduce((s,l)=>s+(l.deposit||0),0)
  const avg=leads.filter(l=>l.price).length?Math.round(leads.filter(l=>l.price).reduce((s,l)=>s+(l.price||0),0)/leads.filter(l=>l.price).length):0
  return <>
    <div className="kpi-grid">
      <div className="kpi green"><div className="kpi-label">הכנסות סגורות</div><div className="kpi-val">{fmt(rev)}</div></div>
      <div className="kpi blue"><div className="kpi-label">מקדמות שנגבו</div><div className="kpi-val">{fmt(dep)}</div></div>
      <div className="kpi amber"><div className="kpi-label">מחיר ממוצע</div><div className="kpi-val">{fmt(avg)}</div></div>
      <div className="kpi purple"><div className="kpi-label">אחוז סגירה</div><div className="kpi-val">{leads.length?Math.round(leads.filter(l=>l.status==='closed').length/leads.length*100):0}%</div></div>
    </div>
    <div className="reports-grid">
      <div className="card">
        <div className="card-title">ביצועי סוכנים</div>
        {!sortedA.length?<div style={{color:'var(--muted)',fontSize:12}}>אין נתונים</div>:sortedA.map(([ag,d])=><div key={ag} className="funnel-row">
          <div className="funnel-top"><span>{ag}</span><span style={{color:'var(--text)',fontWeight:600}}>{d.c} · {fmt(d.r)}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(d.c/maxA*100)}%`,background:'#534AB7'}}/></div>
        </div>)}
      </div>
      <div className="card">
        <div className="card-title">לידים לפי מקור</div>
        {sortedS.map(([src,cnt])=><div key={src} className="funnel-row">
          <div className="funnel-top"><span>{src}</span><span style={{color:'var(--text)',fontWeight:600}}>{cnt}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(cnt/maxS*100)}%`,background:'var(--blue)'}}/></div>
        </div>)}
        <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>הכנסה לפי שלב</div>
          {STATUS_ORDER.map(s=>{const b=leads.filter(l=>l.status===s).reduce((a,l)=>a+(l.price||0),0);return b>0?<div key={s} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'5px 0',borderBottom:'1px solid var(--border)'}}><span style={{color:'var(--muted)'}}>{STATUS_LABELS[s]}</span><span style={{fontWeight:600,color:'var(--green)'}}>{fmt(b)}</span></div>:null})}
        </div>
      </div>
    </div>
  </>
}

const EMPTY_LEAD={name:'',phone:'',city:'',address:'',date:'',kitchen_type:'',kitchen_color:'',marble_color:'',closet_or_flap:'קלפות',length_top:'',length_bottom:'',drawers:'',drawers_position:'שמאל',sink_position:'אמצע',handles:'',led:'',notes:'',price:'',deposit:'',agent:'',status:'new',priority:'בינונית',source:'המלצה',supplied:false,sketch:null}

function LeadModal({lead,onSave,onDelete,onClose}){
  const [form,setForm]=useState(lead?{...lead,price:String(lead.price||''),deposit:String(lead.deposit||''),length_top:String(lead.length_top||''),length_bottom:String(lead.length_bottom||''),drawers:String(lead.drawers||'')}:EMPTY_LEAD)
  const [pendingSketch,setPendingSketch]=useState(null)
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const sketchSrc=pendingSketch||form.sketch
  function handleSketch(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>setPendingSketch(ev.target.result);r.readAsDataURL(file)}
  function submit(){if(!form.name?.trim())return alert('נא להזין שם לקוח');onSave({...form,price:parseFloat(form.price)||0,deposit:parseFloat(form.deposit)||0,length_top:parseFloat(form.length_top)||0,length_bottom:parseFloat(form.length_bottom)||0,drawers:parseInt(form.drawers)||0,sketch:pendingSketch||form.sketch||null,date:form.date||new Date().toISOString().slice(0,10)})}
  const inp=(k,lbl,t='text',ph='')=><div className="ffield"><label className="flabel">{lbl}</label><input className="finput" type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder={ph}/></div>
  const sel=(k,lbl,opts)=><div className="ffield"><label className="flabel">{lbl}</label><select className="finput" value={form[k]||''} onChange={e=>set(k,e.target.value)}>{opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}</select></div>
  return <div className="modal-bg" onClick={e=>e.target.className==='modal-bg'&&onClose()}>
    <div className="modal">
      <div className="modal-header"><div className="modal-title">{lead?'✏️ עריכת הזמנה':'➕ הזמנה חדשה'}</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="form-sec"><div className="sec-title">👤 פרטי לקוח</div>
        <div className="fgrid">{inp('date','תאריך','date')}{inp('name','שם לקוח','text','שם מלא')}{inp('phone','טלפון','tel','050-...')}
          {inp('city','עיר','text','עיר')}<div className="ffield span2"><label className="flabel">כתובת</label><input className="finput" value={form.address||''} onChange={e=>set('address',e.target.value)} placeholder="רחוב ומספר"/></div>
        </div>
      </div>
      <div className="form-sec"><div className="sec-title">🖼️ שרטוט מטבח</div>
        <div className="sketch-upload" onClick={()=>document.getElementById('sketch-inp').click()}>
          {sketchSrc?<><img className="sketch-preview" src={sketchSrc} alt="שרטוט"/><div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>לחץ להחלפה</div></>:<><div style={{fontSize:28,marginBottom:6}}>🖼️</div><div style={{fontSize:13,fontWeight:500}}>העלה שרטוט / תמונת מטבח</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>JPG, PNG, HEIC</div></>}
        </div>
        <input id="sketch-inp" type="file" accept="image/*" style={{display:'none'}} onChange={handleSketch}/>
        {sketchSrc&&<button className="btn danger sm" style={{marginTop:6}} onClick={()=>{setPendingSketch(null);set('sketch',null)}}>🗑️ מחק תמונה</button>}
      </div>
      <div className="form-sec"><div className="sec-title">🪵 פרטי מטבח</div>
        <div className="fgrid">
          {inp('kitchen_color','צבע מטבח','text','לבן, אפור...')}{inp('marble_color','צבע שיש','text','שיש לבן...')}
          {sel('closet_or_flap','קלאפות/ארון',['קלפות','ארון','שניהם','אחר'])}
          {inp('length_top','אורך למעלה','number','1.9')}{inp('length_bottom','אורך למטה','number','1.9')}
          {inp('drawers','מגירות','number','3')}{sel('drawers_position','מיקום מגירות',['שמאל','ימין','מרכז','אחר'])}
          {sel('sink_position','מיקום כיור',['שמאל','ימין','אמצע','אחר'])}
          {inp('handles','ידיות','text','אינטגרלי...')}{inp('led','לד','text','כן/לא/צבע')}
        </div>
      </div>
      <div className="form-sec"><div className="sec-title">🚚 אספקה</div>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0'}}>
          <label className="toggle"><input type="checkbox" checked={!!form.supplied} onChange={e=>set('supplied',e.target.checked)}/><span className="slider"/></label>
          <span style={{fontSize:12}}>{form.supplied?<span style={{color:'var(--green)',fontWeight:500}}>סופק ✓</span>:<span style={{color:'var(--red)'}}>טרם סופק</span>}</span>
        </div>
      </div>
      <div className="form-sec"><div className="sec-title">💰 כספים וניהול</div>
        <div className="fgrid">
          {inp('price','מחיר','number','3450')}{inp('deposit','מקדמה','number','700')}{inp('agent','סוכן','text','')}
          {sel('status','שלב',STATUS_ORDER.map(s=>({v:s,l:STATUS_LABELS[s]})))}
          {sel('priority','עדיפות',['גבוהה','בינונית','נמוכה'])}
          {sel('source','מקור',['המלצה','פייסבוק','אתר אינטרנט','Google','אינסטגרם','יד2','וואטסאפ','אחר'])}
        </div>
      </div>
      <div className="form-sec">
        <div className="ffield full"><label className="flabel">תוספות / חיתוכים / הערות</label><textarea className="finput" rows={3} value={form.notes||''} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={submit}>💾 שמור הזמנה</button>
        <button className="btn ghost" onClick={onClose}>ביטול</button>
        {lead&&<button className="btn danger" style={{marginRight:'auto'}} onClick={()=>{if(window.confirm('למחוק?'))onDelete(lead.id)}}>🗑️ מחק</button>}
      </div>
    </div>
  </div>
}

function InvModal({item,type,onSave,onDelete,onClose}){
  const isStd=type==='standard'
  const [form,setForm]=useState(item?{...item}:{name:'',category:isStd?'מטבחים סטנדרט':'חלקים',unit:"יח׳",qty:0,min:isStd?2:10,color:'',size:''})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  return <div className="modal-bg" onClick={e=>e.target.className==='modal-bg'&&onClose()}>
    <div className="modal" style={{maxWidth:420}}>
      <div className="modal-header"><div className="modal-title">{item?'✏️ עריכה':'➕ '+(isStd?'מטבח סטנדרט':'פריט חדש')}</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="fgrid2" style={{gap:10,marginBottom:14}}>
        <div className="ffield full"><label className="flabel">שם</label><input className="finput" value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder={isStd?'מטבח לבן 1.8מ':'שם הפריט'}/></div>
        {isStd?<><div className="ffield"><label className="flabel">צבע</label><input className="finput" value={form.color||''} onChange={e=>set('color',e.target.value)} placeholder="לבן, אפור..."/></div><div className="ffield"><label className="flabel">גודל</label><input className="finput" value={form.size||''} onChange={e=>set('size',e.target.value)} placeholder="1.8מ..."/></div></>
        :<><div className="ffield"><label className="flabel">קטגוריה</label><input className="finput" value={form.category||''} onChange={e=>set('category',e.target.value)} placeholder="דלתות, שיש..."/></div><div className="ffield"><label className="flabel">יחידה</label><select className="finput" value={form.unit||"יח׳"} onChange={e=>set('unit',e.target.value)}>{["יח׳",'מ"ר',"מ׳",'ק"ג'].map(u=><option key={u}>{u}</option>)}</select></div></>}
        <div className="ffield"><label className="flabel">כמות</label><input className="finput" type="number" value={form.qty||0} min="0" onChange={e=>set('qty',parseInt(e.target.value)||0)}/></div>
        <div className="ffield"><label className="flabel">מינימום</label><input className="finput" type="number" value={form.min||0} min="0" onChange={e=>set('min',parseInt(e.target.value)||0)}/></div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={()=>{if(!form.name?.trim())return alert('נא להזין שם');onSave(form)}}>💾 שמור</button>
        <button className="btn ghost" onClick={onClose}>ביטול</button>
        {item&&<button className="btn danger" style={{marginRight:'auto'}} onClick={()=>{if(window.confirm('למחוק?'))onDelete(item.id)}}>🗑️ מחק</button>}
      </div>
    </div>
  </div>
}

function CKModal({ck,leads,onSave,onDelete,onClose}){
  const [form,setForm]=useState(ck?{...ck}:{name:'',lead_id:null,color:'',size:'',notes:'',status:'wait',date:new Date().toISOString().slice(0,10)})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  return <div className="modal-bg" onClick={e=>e.target.className==='modal-bg'&&onClose()}>
    <div className="modal" style={{maxWidth:460}}>
      <div className="modal-header"><div className="modal-title">{ck?'✏️ עריכת הזמנה מיוחדת':'➕ מטבח בהזמנה מיוחדת'}</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="fgrid2" style={{gap:10,marginBottom:14}}>
        <div className="ffield"><label className="flabel">שייך ללקוח</label><select className="finput" value={form.lead_id||''} onChange={e=>set('lead_id',parseInt(e.target.value)||null)}><option value="">בחר לקוח</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}</select></div>
        <div className="ffield"><label className="flabel">שם המטבח</label><input className="finput" value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="מטבח לבן — שם לקוח"/></div>
        <div className="ffield"><label className="flabel">צבע</label><input className="finput" value={form.color||''} onChange={e=>set('color',e.target.value)}/></div>
        <div className="ffield"><label className="flabel">גודל</label><input className="finput" value={form.size||''} onChange={e=>set('size',e.target.value)} placeholder="1.9מ..."/></div>
        <div className="ffield"><label className="flabel">תאריך</label><input className="finput" type="date" value={form.date||''} onChange={e=>set('date',e.target.value)}/></div>
        <div className="ffield"><label className="flabel">סטטוס</label><select className="finput" value={form.status||'wait'} onChange={e=>set('status',e.target.value)}><option value="wait">בייצור</option><option value="ready">מוכן</option><option value="delivered">נמסר</option></select></div>
        <div className="ffield full"><label className="flabel">הערות</label><textarea className="finput" rows={2} value={form.notes||''} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={()=>{if(!form.name?.trim())return alert('נא להזין שם');onSave(form)}}>💾 שמור</button>
        <button className="btn ghost" onClick={onClose}>ביטול</button>
        {ck&&<button className="btn danger" style={{marginRight:'auto'}} onClick={()=>{if(window.confirm('למחוק?'))onDelete(ck.id)}}>🗑️ מחק</button>}
      </div>
    </div>
  </div>
}

function DeliveryModal({delivery,leads,onSave,onDelete,onClose}){
  const [form,setForm]=useState(delivery?{...delivery}:{driver:'',phone:'',customer:'',address:'',items:'',date:new Date().toISOString().slice(0,10),time:'',status:'wait',notes:''})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  return <div className="modal-bg" onClick={e=>e.target.className==='modal-bg'&&onClose()}>
    <div className="modal" style={{maxWidth:460}}>
      <div className="modal-header"><div className="modal-title">{delivery?'✏️ עריכת הובלה':'➕ הובלה חדשה'}</div><button className="modal-close" onClick={onClose}>✕</button></div>
      <div className="fgrid2" style={{gap:10,marginBottom:14}}>
        <div className="ffield"><label className="flabel">שם נהג</label><input className="finput" value={form.driver||''} onChange={e=>set('driver',e.target.value)} placeholder="שם הנהג"/></div>
        <div className="ffield"><label className="flabel">טלפון</label><input className="finput" type="tel" value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="052-..."/></div>
        <div className="ffield"><label className="flabel">לקוח</label>
          <select className="finput" value={form.customer||''} onChange={e=>{const l=leads.find(x=>x.name===e.target.value);setForm(f=>({...f,customer:e.target.value,address:l?(l.address?l.address+', ':'')+l.city:f.address}))}}>
            <option value="">בחר לקוח</option>{leads.map(l=><option key={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="ffield"><label className="flabel">תאריך</label><input className="finput" type="date" value={form.date||''} onChange={e=>set('date',e.target.value)}/></div>
        <div className="ffield"><label className="flabel">שעה</label><input className="finput" type="time" value={form.time||''} onChange={e=>set('time',e.target.value)}/></div>
        <div className="ffield"><label className="flabel">סטטוס</label><select className="finput" value={form.status||'wait'} onChange={e=>set('status',e.target.value)}><option value="wait">ממתין</option><option value="go">בדרך</option><option value="done">נמסר</option></select></div>
        <div className="ffield full"><label className="flabel">כתובת</label><input className="finput" value={form.address||''} onChange={e=>set('address',e.target.value)} placeholder="רחוב, עיר"/></div>
        <div className="ffield full"><label className="flabel">פריטים לאיסוף</label><input className="finput" value={form.items||''} onChange={e=>set('items',e.target.value)} placeholder="מטבח לבן + שיש..."/></div>
        <div className="ffield full"><label className="flabel">הערות</label><textarea className="finput" rows={2} value={form.notes||''} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={()=>{if(!form.driver?.trim())return alert('נא להזין שם נהג');onSave(form)}}>💾 שמור</button>
        <button className="btn ghost" onClick={onClose}>ביטול</button>
        {delivery&&<button className="btn danger" style={{marginRight:'auto'}} onClick={()=>{if(window.confirm('למחוק?'))onDelete(delivery.id)}}>🗑️ מחק</button>}
      </div>
    </div>
  </div>
}

const PAGES=[
  {id:'dashboard',icon:'📊',label:'לוח בקרה',section:'מכירות'},
  {id:'leads',icon:'📋',label:'הזמנות',section:null},
  {id:'kanban',icon:'🗂️',label:'קנבן',section:null},
  {id:'inventory',icon:'📦',label:'מלאי',section:'מחסן'},
  {id:'deliveries',icon:'🚛',label:'מובילים',section:'לוגיסטיקה'},
  {id:'ai',icon:'🤖',label:'AI Center',section:'כלים'},
  {id:'reports',icon:'📈',label:'דוחות',section:null},
]

export default function App(){
  const [session,setSession]=useState(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [leads,setLeads]=useState([])
  const [inventory,setInventory]=useState([])
  const [custKitchens,setCustKitchens]=useState([])
  const [deliveries,setDeliveries]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [page,setPage]=useState('dashboard')
  const [modal,setModal]=useState(null)
  const [lightbox,setLightbox]=useState(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setSession(session))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!session)return
    loadAll()
    const ch=supabase.channel('changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},loadLeads)
      .on('postgres_changes',{event:'*',schema:'public',table:'inventory'},loadInventory)
      .on('postgres_changes',{event:'*',schema:'public',table:'cust_kitchens'},loadCustKitchens)
      .on('postgres_changes',{event:'*',schema:'public',table:'deliveries'},loadDeliveries)
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[session])

  async function loadAll(){setLoading(true);await Promise.all([loadLeads(),loadInventory(),loadCustKitchens(),loadDeliveries()]);setLoading(false)}
  async function loadLeads(){const{data}=await supabase.from('leads').select('*').order('created_at',{ascending:false});if(data)setLeads(data)}
  async function loadInventory(){const{data}=await supabase.from('inventory').select('*').order('category');if(data)setInventory(data)}
  async function loadCustKitchens(){const{data}=await supabase.from('cust_kitchens').select('*').order('created_at',{ascending:false});if(data)setCustKitchens(data)}
  async function loadDeliveries(){const{data}=await supabase.from('deliveries').select('*').order('date').order('time');if(data)setDeliveries(data)}

  const persist=useCallback(async fn=>{setSaving(true);await fn();setTimeout(()=>setSaving(false),700)},[])

  async function saveLead(form){await persist(async()=>{form.id?await supabase.from('leads').update(form).eq('id',form.id):await supabase.from('leads').insert([form]);setModal(null);loadLeads()})}
  async function deleteLead(id){await persist(async()=>{await supabase.from('leads').delete().eq('id',id);setModal(null);loadLeads()})}
  async function updateSketch(id,sketch){await supabase.from('leads').update({sketch}).eq('id',id);loadLeads()}
  async function saveInv(form){await persist(async()=>{form.id?await supabase.from('inventory').update(form).eq('id',form.id):await supabase.from('inventory').insert([form]);setModal(null);loadInventory()})}
  async function deleteInv(id){await persist(async()=>{await supabase.from('inventory').delete().eq('id',id);setModal(null);loadInventory()})}
  async function adjInv(id,delta){const item=inventory.find(i=>i.id===id);if(!item)return;await supabase.from('inventory').update({qty:Math.max(0,(item.qty||0)+delta)}).eq('id',id);loadInventory()}
  async function saveCK(form){await persist(async()=>{form.id?await supabase.from('cust_kitchens').update(form).eq('id',form.id):await supabase.from('cust_kitchens').insert([form]);setModal(null);loadCustKitchens()})}
  async function deleteCK(id){await persist(async()=>{await supabase.from('cust_kitchens').delete().eq('id',id);setModal(null);loadCustKitchens()})}
  async function cycleCK(id){const ck=custKitchens.find(c=>c.id===id);if(!ck)return;const next=ck.status==='wait'?'ready':ck.status==='ready'?'delivered':'delivered';await supabase.from('cust_kitchens').update({status:next}).eq('id',id);loadCustKitchens()}
  async function saveDelivery(form){await persist(async()=>{form.id?await supabase.from('deliveries').update(form).eq('id',form.id):await supabase.from('deliveries').insert([form]);setModal(null);loadDeliveries()})}
  async function deleteDelivery(id){await persist(async()=>{await supabase.from('deliveries').delete().eq('id',id);setModal(null);loadDeliveries()})}
  async function cycleDeliveryStatus(id){const d=deliveries.find(x=>x.id===id);if(!d)return;const next=d.status==='wait'?'go':d.status==='go'?'done':'done';await supabase.from('deliveries').update({status:next}).eq('id',id);loadDeliveries()}
  async function moveDelivery(id,dir){
    const today=deliveries.filter(d=>d.date>=new Date().toISOString().slice(0,10))
    const idx=today.findIndex(d=>d.id===id)
    const swapIdx=dir==='up'?idx-1:idx+1
    if(swapIdx<0||swapIdx>=today.length)return
    const a=today[idx],b=today[swapIdx]
    await supabase.from('deliveries').update({time:b.time}).eq('id',a.id)
    await supabase.from('deliveries').update({time:a.time}).eq('id',b.id)
    loadDeliveries()
  }

  const lowItems=inventory.filter(i=>i.qty<=i.min).length
  const pendingDel=deliveries.filter(d=>d.status!=='done').length

  if(authLoading)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Heebo,sans-serif',color:'#666'}}>טוען...</div>
  if(!session)return <Auth/>

  let sections=[]
  PAGES.forEach(p=>{if(p.section)sections.push({type:'sec',label:p.section});sections.push({type:'page',...p})})

  return <>
    <style>{CSS}</style>
    {lightbox&&<div className="lb-overlay" onClick={()=>setLightbox(null)}><img className="lb-img" src={lightbox} alt="שרטוט"/></div>}
    <div className="app">
      <div className="sidebar">
        <div className="logo"><h1>🏠 מטבחי CRM</h1><p>{leads.length} הזמנות · {saving?'שומר...':'מסונכרן'}</p></div>
        <div className="nav">
          {sections.map((s,i)=>s.type==='sec'
            ?<div key={i} className="nav-sec">{s.label}</div>
            :<div key={s.id} className={`nav-item${page===s.id?' active':''}`} onClick={()=>setPage(s.id)}>
              <span>{s.icon}</span>{s.label}
              {s.id==='inventory'&&lowItems>0&&<span className="nav-badge">{lowItems}</span>}
              {s.id==='deliveries'&&pendingDel>0&&<span className="nav-badge blue">{pendingDel}</span>}
            </div>
          )}
        </div>
        <div className="sidebar-footer">
          <span style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{session.user.email}</span>
          <button className="btn sm ghost" style={{color:'var(--red)',padding:'3px 8px'}} onClick={()=>supabase.auth.signOut()}>יציאה</button>
        </div>
      </div>
      <div className="main">
        <div className="sync-bar"><div className="sync-dot"/><span>שמירה בענן · {saving?'שומר...':'מסונכרן לכל המשתמשים'}</span></div>
        <div className="topbar">
          <span className="page-title">{PAGES.find(p=>p.id===page)?.label}</span>
          {['leads','inventory','deliveries'].includes(page)&&<button className="btn primary" onClick={()=>{
            if(page==='leads')setModal({type:'lead',data:null})
            else if(page==='inventory')setModal({type:'inv',data:null,invType:'standard'})
            else setModal({type:'delivery',data:null})
          }}>＋ {page==='leads'?'הזמנה חדשה':page==='inventory'?'פריט חדש':'הובלה חדשה'}</button>}
        </div>
        <div className="content">
          {loading?<div style={{textAlign:'center',padding:60,color:'var(--muted)'}}><span className="spinner"/><div style={{marginTop:12}}>טוען...</div></div>:<>
            {page==='dashboard'&&<Dashboard leads={leads} inventory={inventory} custKitchens={custKitchens} deliveries={deliveries}/>}
            {page==='leads'&&<LeadsTable leads={leads} onEdit={l=>setModal({type:'lead',data:l})} onSketchUpload={(id,img)=>updateSketch(id,img)} onSketchView={src=>setLightbox(src)}/>}
            {page==='kanban'&&<Kanban leads={leads} onEdit={l=>setModal({type:'lead',data:l})}/>}
            {page==='inventory'&&<Inventory inventory={inventory} custKitchens={custKitchens} leads={leads} onEditInv={(item,t)=>setModal({type:'inv',data:item,invType:t||(item?.category==='מטבחים סטנדרט'?'standard':'part')})} onAdjInv={adjInv} onEditCK={ck=>setModal({type:'ck',data:ck})} onCycleCK={cycleCK} onAddPart={()=>setModal({type:'inv',data:null,invType:'part'})}/>}
            {page==='deliveries'&&<Deliveries deliveries={deliveries} leads={leads} onEdit={d=>setModal({type:'delivery',data:d})} onCycleStatus={cycleDeliveryStatus} onMoveUp={id=>moveDelivery(id,'up')} onMoveDown={id=>moveDelivery(id,'down')}/>}
            {page==='ai'&&<AICenter leads={leads}/>}
            {page==='reports'&&<Reports leads={leads}/>}
          </>}
        </div>
      </div>
    </div>
    {modal?.type==='lead'&&<LeadModal lead={modal.data} onSave={saveLead} onDelete={deleteLead} onClose={()=>setModal(null)}/>}
    {modal?.type==='inv'&&<InvModal item={modal.data} type={modal.invType||'standard'} onSave={saveInv} onDelete={deleteInv} onClose={()=>setModal(null)}/>}
    {modal?.type==='ck'&&<CKModal ck={modal.data} leads={leads} onSave={saveCK} onDelete={deleteCK} onClose={()=>setModal(null)}/>}
    {modal?.type==='delivery'&&<DeliveryModal delivery={modal.data} leads={leads} onSave={saveDelivery} onDelete={deleteDelivery} onClose={()=>setModal(null)}/>}
  </>
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'

const STATUS_LABELS = { new:'ליד חדש', contact:'יצירת קשר', design:'תכנון מטבח', offer:'הצעת מחיר', closed:'סגירה', lost:'אבוד' }
const STATUS_ORDER = ['new','contact','design','offer','closed','lost']
const STATUS_COLORS = { new:'#185FA5', contact:'#854F0B', design:'#27500A', offer:'#3C3489', closed:'#177a3c', lost:'#791F1F' }
const STATUS_BG = { new:'#E6F1FB', contact:'#FAEEDA', design:'#EAF3DE', offer:'#EEEDFE', closed:'#EAF3DE', lost:'#FCEBEB' }

const fmt = n => n ? '₪' + Number(n).toLocaleString() : '—'
const daysSince = d => Math.floor((new Date() - new Date(d)) / 864e5)

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
.search{padding:7px 13px;font-size:12px;border:1px solid var(--border2);border-radius:20px;background:var(--surface);color:var(--text);direction:rtl;font-family:inherit;width:200px}
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
.age-old{color:var(--red);font-weight:600;font-size:10px}.age-mid{color:var(--amber);font-weight:600;font-size:10px}.age-new{color:var(--green);font-weight:600;font-size:10px}
.sketch-thumb{width:32px;height:32px;border-radius:4px;object-fit:cover;border:1px solid var(--border);cursor:pointer;display:block}
.sketch-icon{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;background:transparent;border:none;padding:0;color:var(--muted)}
.sketch-icon:hover{color:var(--blue)}
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
.chat-msg{display:flex;gap:8px}.chat-msg.user{flex-direction:row-reverse}
.chat-bubble{padding:10px 14px;border-radius:var(--radius);font-size:13px;line-height:1.6;max-width:80%}
.chat-msg.ai .chat-bubble{background:var(--surface2);border:1px solid var(--border)}
.chat-msg.user .chat-bubble{background:var(--blue);color:#fff}
.chat-input-row{display:flex;gap:8px;margin-top:12px}
.chat-input{flex:1;padding:9px 13px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2);color:var(--text);direction:rtl;font-family:inherit}
.chat-input:focus{outline:none;border-color:var(--blue)}
.lead-sel{padding:8px 12px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2);color:var(--text);direction:rtl;font-family:inherit;width:100%}
.reports-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;z-index:300;padding:20px;overflow-y:auto}
.modal{background:var(--surface);border-radius:14px;width:700px;max-width:96vw;padding:26px 28px;direction:rtl;margin:auto}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.modal-title{font-size:16px;font-weight:600}
.modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:2px 6px;border-radius:4px}
.modal-close:hover{background:var(--surface2)}
.form-sec{margin-bottom:18px}
.sec-title{font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--border)}
.fgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.fgrid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ffield{display:flex;flex-direction:column;gap:4px}
.ffield.span2{grid-column:span 2}.ffield.full{grid-column:1/-1}
.flabel{font-size:11px;color:var(--muted);font-weight:600}
.finput{padding:8px 10px;font-size:13px;border:1px solid var(--border2);border-radius:var(--radius-sm);background:var(--surface2);color:var(--text);direction:rtl;font-family:inherit;width:100%}
.finput:focus{outline:none;border-color:var(--blue);background:var(--surface)}
.modal-foot{display:flex;gap:8px;padding-top:16px;border-top:1px solid var(--border);align-items:center}
.sketch-upload{border:2px dashed var(--border2);border-radius:var(--radius);padding:20px;text-align:center;cursor:pointer;transition:all .13s}
.sketch-upload:hover{border-color:var(--blue);background:var(--surface2)}
.sketch-preview{max-width:100%;max-height:200px;border-radius:var(--radius-sm);object-fit:contain;margin-top:8px}
.spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(0,0,0,.1);border-top-color:var(--blue);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
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

function SBadge({s}){
  const cls={new:'s-new',contact:'s-contact',design:'s-design',offer:'s-offer',closed:'s-closed',lost:'s-lost'}
  return <span className={`sbadge ${cls[s]||'s-new'}`}>{STATUS_LABELS[s]}</span>
}
function PBadge({p}){return <span className={p==='גבוהה'?'ph':p==='נמוכה'?'pl':'pm'}>{p}</span>}
function AgeLabel({date}){
  if(!date)return null
  const n=daysSince(date)
  if(n===0)return <span className="age-new">היום</span>
  if(n===1)return <span className="age-new">אתמול</span>
  if(n<=7)return <span className="age-new">לפני {n}י׳</span>
  if(n<=30)return <span className="age-mid">לפני {n}י׳</span>
  return <span className="age-old">לפני {n}י׳</span>
}

function PositionSelect({k,lbl,opts,form,set}){
  return <div className="ffield">
    <label className="flabel">{lbl}</label>
    <select className="finput" value={form[k]||''} onChange={e=>set(k,e.target.value)}>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
    {form[k]==='אחר'&&(
      <input className="finput" style={{marginTop:6}} value={form[k+'_other']||''} onChange={e=>set(k+'_other',e.target.value)} placeholder={`פרטי ${lbl}...`}/>
    )}
  </div>
}

function Dashboard({leads}){
  const rev=leads.filter(l=>l.status==='closed').reduce((s,l)=>s+(l.price||0),0)
  const dep=leads.reduce((s,l)=>s+(l.deposit||0),0)
  const notDelivered=leads.filter(l=>l.status==='closed'&&!l.supplied).length
  const counts={};STATUS_ORDER.forEach(s=>counts[s]=leads.filter(l=>l.status===s).length)
  const maxC=Math.max(...Object.values(counts),1)
  const oldLeads=[...leads].filter(l=>!['closed','lost'].includes(l.status)).sort((a,b)=>new Date(a.date)-new Date(b.date))
  return <>
    <div className="kpi-grid">
      <div className="kpi blue"><div className="kpi-label">סה"כ לקוחות</div><div className="kpi-val">{leads.length}</div></div>
      <div className="kpi green"><div className="kpi-label">הכנסות סגורות</div><div className="kpi-val">{fmt(rev)}</div></div>
      <div className="kpi purple"><div className="kpi-label">מקדמות שנגבו</div><div className="kpi-val">{fmt(dep)}</div></div>
      <div className={`kpi ${notDelivered>0?'amber':'green'}`}>
        <div className="kpi-label" style={notDelivered>0?{color:'var(--red)'}:{}}>{notDelivered>0?'⚠️ ממתינים להובלה':'✓ הכל סופק'}</div>
        <div className="kpi-val" style={notDelivered>0?{color:'var(--red)'}:{}}>{notDelivered}</div>
      </div>
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
        {oldLeads.slice(0,6).map(l=><div key={l.id} style={{display:'flex',gap:8,padding:'7px 0',borderBottom:'1px solid var(--border)',alignItems:'center'}}>
          <div style={{width:5,height:5,borderRadius:'50%',flexShrink:0,background:daysSince(l.date)>14?'var(--red)':daysSince(l.date)>7?'var(--amber)':'var(--green)'}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.name} — {l.city}</div>
            <div style={{fontSize:10,color:'var(--muted)'}}>{STATUS_LABELS[l.status]}</div>
          </div>
          <AgeLabel date={l.date}/>
        </div>)}
        {!oldLeads.length&&<div style={{fontSize:12,color:'var(--muted)'}}>כל הלקוחות טופלו ✓</div>}
      </div>
    </div>
  </>
}

function LeadsTable({leads,onEdit,onSketchUpload,onSketchView}){
  const [filter,setFilter]=useState('all')
  const [q,setQ]=useState('')
  const [sortDir,setSortDir]=useState('desc')
  const fileRef=useRef(null)
  const [quickId,setQuickId]=useState(null)
  const list=[...leads].filter(l=>{
    const mq=!q||l.name?.includes(q)||l.city?.includes(q)||l.phone?.includes(q)||l.agent?.includes(q)
    return mq&&(filter==='all'||l.status===filter)
  }).sort((a,b)=>sortDir==='asc'?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date))
  function handleQuickUpload(e){
    const file=e.target.files[0];if(!file||!quickId)return
    const reader=new FileReader()
    reader.onload=ev=>{onSketchUpload(quickId,ev.target.result);e.target.value=''}
    reader.readAsDataURL(file)
  }
  return <>
    <div className="toolbar">
      <input className="search" placeholder="חיפוש שם, עיר, טלפון, סוכן..." value={q} onChange={e=>setQ(e.target.value)}/>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        {['all',...STATUS_ORDER].map(s=><button key={s} className={`chip${filter===s?' active':''}`} onClick={()=>setFilter(s)}>{s==='all'?'הכל':STATUS_LABELS[s]}</button>)}
      </div>
      <button className={`chip${sortDir==='asc'?' active':''}`} onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>{sortDir==='asc'?'↑ ישן→חדש':'↓ חדש→ישן'}</button>
    </div>
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th style={{width:'4%'}}>שרטוט</th>
          <th style={{width:'14%'}}>שם לקוח</th>
          <th style={{width:'10%'}}>טלפון</th>
          <th style={{width:'9%'}}>עיר</th>
          <th style={{width:'12%'}}>מטבח</th>
          <th style={{width:'8%'}}>מחיר</th>
          <th style={{width:'7%'}}>מקדמה</th>
          <th style={{width:'7%'}}>הובלה</th>
          <th style={{width:'10%'}}>שלב</th>
          <th style={{width:'7%'}}>סוכן</th>
          <th style={{width:'8%'}}>תאריך</th>
          <th style={{width:'4%'}}></th>
        </tr></thead>
        <tbody>
          {!list.length&&<tr><td colSpan={12} style={{textAlign:'center',color:'var(--muted)',padding:28}}>אין תוצאות</td></tr>}
          {list.map(l=><tr key={l.id} onClick={()=>onEdit(l)}>
            <td onClick={e=>e.stopPropagation()}>
              {l.sketch?<img className="sketch-thumb" src={l.sketch} onClick={()=>onSketchView(l.sketch)} alt="שרטוט"/>
                :<button className="sketch-icon" onClick={()=>{setQuickId(l.id);fileRef.current?.click()}}>🖼️</button>}
            </td>
            <td><div style={{fontWeight:600,fontSize:13}}>{l.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{l.address||''}</div></td>
            <td style={{color:'var(--muted)'}}>{l.phone||'—'}</td>
            <td style={{color:'var(--muted)'}}>{l.city||'—'}</td>
            <td><div style={{fontSize:12}}>{l.kitchen_color||'—'}</div><div style={{fontSize:10,color:'var(--muted)'}}>{l.marble_color||''}</div></td>
            <td style={{fontWeight:600,color:'var(--green)'}}>{fmt(l.price)}</td>
            <td style={{color:'var(--muted)'}}>{fmt(l.deposit)}</td>
            <td style={{color:'var(--muted)'}}>{fmt(l.delivery_price)}</td>
            <td><SBadge s={l.status}/></td>
            <td style={{color:'var(--muted)',fontSize:11}}>{l.agent||'—'}</td>
            <td style={{fontSize:11}}>{l.date?<AgeLabel date={l.date}/>:'—'}</td>
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
        <div className="khdr" style={{background:STATUS_BG[s],color:STATUS_COLORS[s]}}>
          {STATUS_LABELS[s]}<span style={{background:'rgba(0,0,0,.1)',borderRadius:10,padding:'0 7px',fontWeight:400}}>{cards.length}</span>
        </div>
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

function AICenter({leads}){
  const [tab,setTab]=useState('analyze')
  const [selId,setSelId]=useState(leads[0]?.id||null)
  const [result,setResult]=useState('')
  const [loading,setLoading]=useState(false)
  const [chatMsgs,setChatMsgs]=useState([{role:'ai',text:'שלום! אני העוזר ה-AI. במה אוכל לעזור?'}])
  const [chatInput,setChatInput]=useState('')
  const chatRef=useRef(null)
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight},[chatMsgs])
  const hasKey=!!import.meta.env.VITE_CLAUDE_API_KEY
  async function analyze(){
    const lead=leads.find(l=>l.id===selId);if(!lead)return
    setLoading(true);setResult('')
    const r=await callClaude([{role:'user',content:`נתח: ${lead.name} | ${lead.city} | מחיר: ${fmt(lead.price)} | שלב: ${STATUS_LABELS[lead.status]} | מטבח: ${lead.kitchen_color||'—'}\nתן: 1) פוטנציאל 2) צעד הבא 3) סיכון 4) טיפ לסגירה`}])
    setResult(r);setLoading(false)
  }
  async function weekly(){
    setLoading(true);setResult('')
    const r=await callClaude([{role:'user',content:`סיכום שבועי: ${STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(' | ')}. הכנסות: ${fmt(leads.filter(l=>l.status==='closed').reduce((s,l)=>s+(l.price||0),0))}. תן הישגים, אתגרים, 3 המלצות.`}])
    setResult(r);setLoading(false)
  }
  async function sendChat(){
    if(!chatInput.trim())return
    const msg=chatInput;setChatInput('')
    setChatMsgs(prev=>[...prev,{role:'user',text:msg}])
    setLoading(true)
    const h=chatMsgs.map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}))
    const r=await callClaude([...h,{role:'user',content:`${STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(', ')}.\n${msg}`}])
    setChatMsgs(prev=>[...prev,{role:'ai',text:r}])
    setLoading(false)
  }
  if(!hasKey)return <div className="card" style={{fontSize:13,color:'var(--muted)',lineHeight:1.7}}><div style={{fontWeight:600,marginBottom:8,fontSize:14,color:'var(--text)'}}>🤖 AI Center</div>יש להגדיר <code>VITE_CLAUDE_API_KEY</code> ב-Vercel → Environment Variables.</div>
  return <div>
    <div className="ai-tabs">
      {[['analyze','🔍 ניתוח לקוח'],['weekly','📊 סיכום שבועי'],['chat',"💬 צ'אט"]].map(([v,l])=>
        <button key={v} className={`ai-tab${tab===v?' active':''}`} onClick={()=>{setTab(v);setResult('')}}>{l}</button>)}
    </div>
    {tab==='analyze'&&<div className="ai-box">
      <select className="lead-sel" value={selId||''} onChange={e=>setSelId(e.target.value)}>{leads.map(l=><option key={l.id} value={l.id}>{l.name} — {l.city} — {fmt(l.price)}</option>)}</select>
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
  const byAgent=leads.reduce((acc,l)=>{if(l.agent){acc[l.agent]=acc[l.agent]||{c:0,r:0};acc[l.agent].c++;if(l.status==='closed')acc[l.agent].r+=(l.price||0)}return acc},{})
  const sortedA=Object.entries(byAgent).sort((a,b)=>b[1].c-a[1].c)
  const maxA=sortedA[0]?.[1].c||1
  const rev=leads.filter(l=>l.status==='closed').reduce((s,l)=>s+(l.price||0),0)
  const dep=leads.reduce((s,l)=>s+(l.deposit||0),0)
  const delivery=leads.reduce((s,l)=>s+(l.delivery_price||0),0)
  const avg=leads.filter(l=>l.price).length?Math.round(leads.filter(l=>l.price).reduce((s,l)=>s+(l.price||0),0)/leads.filter(l=>l.price).length):0
  return <>
    <div className="kpi-grid">
      <div className="kpi green"><div className="kpi-label">הכנסות סגורות</div><div className="kpi-val">{fmt(rev)}</div></div>
      <div className="kpi blue"><div className="kpi-label">מקדמות שנגבו</div><div className="kpi-val">{fmt(dep)}</div></div>
      <div className="kpi amber"><div className="kpi-label">הובלות</div><div className="kpi-val">{fmt(delivery)}</div></div>
      <div className="kpi purple"><div className="kpi-label">מחיר ממוצע</div><div className="kpi-val">{fmt(avg)}</div></div>
    </div>
    <div className="reports-grid">
      <div className="card">
        <div className="card-title">ביצועי סוכנים</div>
        {!sortedA.length?<div style={{color:'var(--muted)',fontSize:12}}>אין נתונים</div>:sortedA.map(([ag,d])=><div key={ag} className="funnel-row">
          <div className="funnel-top"><span>{ag}</span><span style={{color:'var(--text)',fontWeight:600}}>{d.c} לקוחות · {fmt(d.r)}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(d.c/maxA*100)}%`,background:'#534AB7'}}/></div>
        </div>)}
      </div>
      <div className="card">
        <div className="card-title">הכנסה לפי שלב</div>
        {STATUS_ORDER.map(s=>{
          const b=leads.filter(l=>l.status===s).reduce((a,l)=>a+(l.price||0),0)
          const cnt=leads.filter(l=>l.status===s).length
          return b>0?<div key={s} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
            <div><div style={{fontWeight:500}}>{STATUS_LABELS[s]}</div><div style={{fontSize:10,color:'var(--muted)'}}>{cnt} לקוחות</div></div>
            <span style={{fontWeight:600,color:'var(--green)'}}>{fmt(b)}</span>
          </div>:null
        })}
      </div>
    </div>
  </>
}

function UsersTab({currentUserId}){
  const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(null)
  useEffect(()=>{loadUsers()},[])
  async function loadUsers(){
    setLoading(true)
    const{data}=await supabase.from('profiles').select('*').order('created_at')
    if(data)setUsers(data)
    setLoading(false)
  }
  async function updateRole(id,role){
    setSaving(id)
    await supabase.from('profiles').update({role}).eq('id',id)
    await loadUsers()
    setSaving(null)
  }
  async function updateName(id,full_name){
    await supabase.from('profiles').update({full_name}).eq('id',id)
    loadUsers()
  }
  const roleColors={admin:{bg:'#EEEDFE',color:'#3C3489'},agent:{bg:'#EAF3DE',color:'#27500A'},viewer:{bg:'#FAEEDA',color:'#633806'}}
  const roleLabels={admin:'מנהל',agent:'סוכן',viewer:'צפייה בלבד'}
  if(loading)return <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}><span className="spinner"/></div>
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:600}}>{users.length} משתמשים רשומים</div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>ניהול הרשאות וגישה למערכת</div>
      </div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {users.map(u=>{
        const rc=roleColors[u.role]||roleColors.agent
        const isMe=u.id===currentUserId
        return <div key={u.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,display:'flex',gap:14,alignItems:'center'}}>
          <div style={{width:42,height:42,borderRadius:'50%',background:'var(--blue-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:600,color:'var(--blue)',flexShrink:0}}>
            {(u.full_name||u.email||'?')[0].toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <input
                style={{fontSize:13,fontWeight:500,border:'none',background:'transparent',color:'var(--text)',fontFamily:'inherit',width:180,outline:'none',borderBottom:'1px dashed var(--border2)'}}
                onBlur={e=>updateName(u.id,e.target.value)}
                defaultValue={u.full_name||''}
                placeholder="הזן שם מלא"
              />
              {isMe&&<span style={{fontSize:10,background:'var(--blue-dim)',color:'var(--blue)',padding:'1px 7px',borderRadius:10,fontWeight:600}}>אני</span>}
            </div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{u.email}</div>
            <div style={{fontSize:10,color:'var(--faint)',marginTop:2}}>נרשם: {new Date(u.created_at).toLocaleDateString('he-IL')}</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
            <span style={{background:rc.bg,color:rc.color,fontSize:11,fontWeight:600,padding:'2px 10px',borderRadius:20}}>{roleLabels[u.role]||u.role}</span>
            <select
              style={{padding:'5px 8px',fontSize:11,border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',background:'var(--surface2)',color:'var(--text)',fontFamily:'inherit',cursor:'pointer'}}
              value={u.role||'agent'}
              onChange={e=>updateRole(u.id,e.target.value)}
              disabled={saving===u.id}
            >
              <option value="admin">מנהל — גישה מלאה</option>
              <option value="agent">סוכן — הזנה ועריכה</option>
              <option value="viewer">צפייה בלבד</option>
            </select>
            {saving===u.id&&<span style={{fontSize:10,color:'var(--muted)'}}>שומר...</span>}
          </div>
        </div>
      })}
    </div>
    <div style={{marginTop:16,padding:14,background:'var(--surface2)',borderRadius:'var(--radius)',fontSize:12,color:'var(--muted)',lineHeight:1.7}}>
      💡 <strong>הרשאות:</strong> מנהל — גישה לכל הפיצ׳רים כולל ניהול משתמשים · סוכן — הזנה ועריכת לקוחות · צפייה בלבד — קריאה בלבד
    </div>
  </div>
}

const EMPTY = {
  name:'', phone:'', city:'', address:'', date:'',
  length_top:'', closet_or_flap:'קלפות', length_bottom:'',
  drawers:'', drawers_position:'שמאל',
  sink_position:'שמאל', sink_position_other:'',
  dishwasher_position:'אין', dishwasher_position_other:'',
  oven_position:'אין', oven_position_other:'',
  stove_position:'מרכז', stove_position_other:'',
  kitchen_color:'', marble_color:'', handles:'', led:'', notes:'',
  price:'', deposit:'', delivery_price:'',
  status:'new', priority:'בינונית', source:'המלצה', agent:'', supplied:false, sketch:null
}

function LeadModal({lead,onSave,onDelete,onClose}){
  const [form,setForm]=useState(lead?{
    ...EMPTY,...lead,
    price:String(lead.price||''),
    deposit:String(lead.deposit||''),
    delivery_price:String(lead.delivery_price||''),
    length_top:String(lead.length_top||''),
    length_bottom:String(lead.length_bottom||''),
    drawers:String(lead.drawers||''),
  }:EMPTY)
  const [pendingSketch,setPendingSketch]=useState(null)
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const sketchSrc=pendingSketch||form.sketch
  function handleSketch(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>setPendingSketch(ev.target.result);r.readAsDataURL(file)}
  function submit(){
    if(!form.name?.trim())return alert('נא להזין שם לקוח')
    onSave({...form,price:parseFloat(form.price)||0,deposit:parseFloat(form.deposit)||0,delivery_price:parseFloat(form.delivery_price)||0,length_top:parseFloat(form.length_top)||0,length_bottom:parseFloat(form.length_bottom)||0,drawers:parseInt(form.drawers)||0,sketch:pendingSketch||form.sketch||null,date:form.date||new Date().toISOString().slice(0,10)})
  }
  const inp=(k,lbl,t='text',ph='')=><div className="ffield"><label className="flabel">{lbl}</label><input className="finput" type={t} value={form[k]||''} onChange={e=>set(k,e.target.value)} placeholder={ph}/></div>
  const sel=(k,lbl,opts)=><div className="ffield"><label className="flabel">{lbl}</label><select className="finput" value={form[k]||''} onChange={e=>set(k,e.target.value)}>{opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}</select></div>

  return <div className="modal-bg" onClick={e=>e.target.className==='modal-bg'&&onClose()}>
    <div className="modal">
      <div className="modal-header"><div className="modal-title">{lead?'✏️ עריכת לקוח':'➕ לקוח חדש'}</div><button className="modal-close" onClick={onClose}>✕</button></div>

      <div className="form-sec">
        <div className="sec-title">👤 פרטי לקוח</div>
        <div className="fgrid">
          {inp('date','תאריך','date')}
          {inp('name','שם מלא','text','שם ושם משפחה')}
          {inp('phone','טלפון','tel','050-0000000')}
          {inp('city','עיר','text','עיר')}
          <div className="ffield span2"><label className="flabel">כתובת</label><input className="finput" value={form.address||''} onChange={e=>set('address',e.target.value)} placeholder="רחוב ומספר בית"/></div>
        </div>
      </div>

      <div className="form-sec">
        <div className="sec-title">🖼️ שרטוט מטבח</div>
        <div className="sketch-upload" onClick={()=>document.getElementById('sk-inp').click()}>
          {sketchSrc?<><img className="sketch-preview" src={sketchSrc} alt="שרטוט"/><div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>לחץ להחלפה</div></>:<><div style={{fontSize:28,marginBottom:6}}>🖼️</div><div style={{fontSize:13,fontWeight:500}}>העלה שרטוט / תמונת מטבח</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>JPG, PNG, HEIC</div></>}
        </div>
        <input id="sk-inp" type="file" accept="image/*" style={{display:'none'}} onChange={handleSketch}/>
        {sketchSrc&&<button className="btn danger sm" style={{marginTop:6}} onClick={()=>{setPendingSketch(null);set('sketch',null)}}>🗑️ מחק תמונה</button>}
      </div>

      <div className="form-sec">
        <div className="sec-title">🪵 פרטי מטבח</div>
        <div className="fgrid">
          {inp('length_top','אורך למעלה (מ׳)','number','1.9')}
          {sel('closet_or_flap','קלאפות או ארון',['קלפות','ארון','שניהם','אחר'])}
          {inp('length_bottom','אורך למטה (מ׳)','number','1.9')}
          {inp('drawers','מגירות','number','3')}
          {sel('drawers_position','מיקום מגירות',['שמאל','ימין','מרכז','אחר'])}
          {inp('kitchen_color','צבע מטבח','text','לבן, אפור...')}
          {inp('marble_color','צבע שיש','text','שיש לבן עם גידים...')}
          {inp('handles','ידיות אינטגרלי','text','שחור, לבן, נירוסטה...')}
          {inp('led','לד','text','כן / לא / צבע')}
        </div>
      </div>

      <div className="form-sec">
        <div className="sec-title">🚿 מיקום מכשירים</div>
        <div className="fgrid">
          <PositionSelect k="sink_position" lbl="מיקום כיור" opts={['שמאל','ימין','אמצע','אחר']} form={form} set={set}/>
          <PositionSelect k="dishwasher_position" lbl="מיקום מדיח" opts={['אין','שמאל','ימין','אחר']} form={form} set={set}/>
          <PositionSelect k="oven_position" lbl="מיקום תנור" opts={['אין','שמאל','ימין','מרכז','אחר']} form={form} set={set}/>
          <PositionSelect k="stove_position" lbl="מיקום כיריים" opts={['אין','שמאל','ימין','מרכז','אחר']} form={form} set={set}/>
        </div>
      </div>

      <div className="form-sec">
        <div className="ffield full"><label className="flabel">תוספות / הערות / חיתוך מיוחד</label><textarea className="finput" rows={3} value={form.notes||''} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}}/></div>
      </div>

      <div className="form-sec">
        <div className="sec-title">💰 כספים</div>
        <div className="fgrid">
          {inp('price','מחיר','number','5000')}
          {inp('deposit','מקדמה','number','1000')}
          {inp('delivery_price','הובלה והתקנה','number','500')}
        </div>
      </div>

      <div className="form-sec">
        <div className="sec-title">⚙️ ניהול</div>
        <div className="fgrid">
          {sel('status','שלב',STATUS_ORDER.map(s=>({v:s,l:STATUS_LABELS[s]})))}
          {sel('priority','עדיפות',['גבוהה','בינונית','נמוכה'])}
          {inp('agent','סוכן אחראי','text','שם הסוכן')}
          {sel('source','מקור ליד',['המלצה','פייסבוק','אתר אינטרנט','Google','אינסטגרם','יד2','וואטסאפ','אחר'])}
          <div className="ffield">
            <label className="flabel">סופק</label>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0'}}>
              <label style={{position:'relative',width:38,height:20,flexShrink:0,cursor:'pointer'}}>
                <input type="checkbox" checked={!!form.supplied} onChange={e=>set('supplied',e.target.checked)} style={{opacity:0,width:0,height:0}}/>
                <span style={{position:'absolute',cursor:'pointer',inset:0,background:form.supplied?'var(--green)':'var(--surface2)',border:`1px solid ${form.supplied?'var(--green)':'var(--border2)'}`,borderRadius:20,transition:'.2s'}}>
                  <span style={{position:'absolute',height:14,width:14,right:form.supplied?'auto':2,left:form.supplied?2:'auto',top:2,background:form.supplied?'#fff':'var(--muted)',borderRadius:'50%',transition:'.2s'}}/>
                </span>
              </label>
              <span style={{fontSize:13}}>{form.supplied?<span style={{color:'var(--green)',fontWeight:500}}>סופק ✓</span>:<span style={{color:'var(--red)'}}>טרם סופק</span>}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-foot">
        <button className="btn primary" onClick={submit}>💾 שמור</button>
        <button className="btn ghost" onClick={onClose}>ביטול</button>
        {lead&&<button className="btn danger" style={{marginRight:'auto'}} onClick={()=>{if(window.confirm('למחוק לקוח זה?'))onDelete(lead.id)}}>🗑️ מחק</button>}
      </div>
    </div>
  </div>
}

const PAGES=[
  {id:'dashboard',icon:'📊',label:'לוח בקרה',section:'ראשי'},
  {id:'leads',icon:'📋',label:'לקוחות',section:null},
  {id:'kanban',icon:'🗂️',label:'קנבן',section:null},
  {id:'ai',icon:'🤖',label:'AI Center',section:'כלים'},
  {id:'reports',icon:'📈',label:'דוחות',section:null},
  {id:'users',icon:'👥',label:'משתמשים',section:'ניהול'},
]

export default function App(){
  const [session,setSession]=useState(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [leads,setLeads]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [page,setPage]=useState('dashboard')
  const [modal,setModal]=useState(null)
  const [lightbox,setLightbox]=useState(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!session)return
    loadLeads()
    const ch=supabase.channel('leads-ch')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},loadLeads)
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[session])

  async function loadLeads(){
    setLoading(true)
    const{data}=await supabase.from('leads').select('*').order('created_at',{ascending:false})
    if(data)setLeads(data)
    setLoading(false)
  }

  const persist=useCallback(async fn=>{setSaving(true);await fn();setTimeout(()=>setSaving(false),700)},[])

  async function saveLead(form){
    await persist(async()=>{
      if(form.id)await supabase.from('leads').update(form).eq('id',form.id)
      else await supabase.from('leads').insert([form])
      setModal(null);loadLeads()
    })
  }
  async function deleteLead(id){
    await persist(async()=>{await supabase.from('leads').delete().eq('id',id);setModal(null);loadLeads()})
  }
  async function updateSketch(id,sketch){
    await supabase.from('leads').update({sketch}).eq('id',id);loadLeads()
  }

  if(authLoading)return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Heebo,sans-serif',color:'#666'}}>טוען...</div>
  if(!session)return <Auth/>

  let sections=[]
  PAGES.forEach(p=>{if(p.section)sections.push({type:'sec',label:p.section});sections.push({type:'page',...p})})

  return <>
    <style>{CSS}</style>
    {lightbox&&<div className="lb-overlay" onClick={()=>setLightbox(null)}><img className="lb-img" src={lightbox} alt="שרטוט"/></div>}
    <div className="app">
      <div className="sidebar">
        <div className="logo"><h1>🏠 מטבחי CRM</h1><p>{leads.length} לקוחות · {saving?'שומר...':'מסונכרן'}</p></div>
        <div className="nav">
          {sections.map((s,i)=>s.type==='sec'
            ?<div key={i} className="nav-sec">{s.label}</div>
            :<div key={s.id} className={`nav-item${page===s.id?' active':''}`} onClick={()=>setPage(s.id)}><span>{s.icon}</span>{s.label}</div>
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
          {page==='leads'&&<button className="btn primary" onClick={()=>setModal({type:'lead',data:null})}>＋ לקוח חדש</button>}
        </div>
        <div className="content">
          {loading
            ?<div style={{textAlign:'center',padding:60,color:'var(--muted)'}}><span className="spinner"/><div style={{marginTop:12}}>טוען...</div></div>
            :<>
              {page==='dashboard'&&<Dashboard leads={leads}/>}
              {page==='leads'&&<LeadsTable leads={leads} onEdit={l=>setModal({type:'lead',data:l})} onSketchUpload={updateSketch} onSketchView={src=>setLightbox(src)}/>}
              {page==='kanban'&&<Kanban leads={leads} onEdit={l=>setModal({type:'lead',data:l})}/>}
              {page==='ai'&&<AICenter leads={leads}/>}
              {page==='reports'&&<Reports leads={leads}/>}
              {page==='users'&&<UsersTab currentUserId={session.user.id}/>}
            </>}
        </div>
      </div>
    </div>
    {modal?.type==='lead'&&<LeadModal lead={modal.data} onSave={saveLead} onDelete={deleteLead} onClose={()=>setModal(null)}/>}
  </>
}

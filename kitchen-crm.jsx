import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_LABELS = { new:"ליד חדש", contact:"יצירת קשר", design:"תכנון מטבח", offer:"הצעת מחיר", closed:"סגירה", lost:"אבוד" };
const STATUS_ORDER = ["new","contact","design","offer","closed","lost"];
const STORAGE_KEY = "kitchen_crm_leads_v3";

const SEED_LEADS = [
  { id:1, name:"דנה לוי", phone:"054-1234567", email:"dana@gmail.com", city:"הרצליה", budget:85000, source:"המלצה", priority:"גבוהה", status:"offer", notes:"מטבח גדול, אי מרכזי", date:"2025-04-01", assigned:"יוסי כ.", fb_msg:null },
  { id:2, name:"אמיר כהן", phone:"052-9876543", email:"amir@gmail.com", city:"תל אביב", budget:45000, source:"פייסבוק", priority:"בינונית", status:"design", notes:"דירת 4 חדרים", date:"2025-04-03", assigned:"רותי מ.", fb_msg:"היי, ראיתי את הפוסט שלכם. אני מחפש מטבח מודרני." },
  { id:3, name:"שרית מזרחי", phone:"050-5551234", email:"sarit@walla.com", city:"פתח תקווה", budget:120000, source:"אתר אינטרנט", priority:"גבוהה", status:"closed", notes:"מטבח יוקרתי, בית פרטי", date:"2025-03-28", assigned:"יוסי כ.", fb_msg:null },
  { id:4, name:"גיל אברהם", phone:"058-7773344", email:"gil@gmail.com", city:"רמת גן", budget:30000, source:"יד2", priority:"נמוכה", status:"contact", notes:"", date:"2025-04-07", assigned:"רותי מ.", fb_msg:null },
  { id:5, name:"נועה שפירו", phone:"053-2223344", email:"noa@outlook.com", city:"כפר סבא", budget:65000, source:"Google", priority:"בינונית", status:"new", notes:"", date:"2025-04-09", assigned:"", fb_msg:null },
  { id:6, name:"יעל ברק", phone:"054-8889900", email:"yael@gmail.com", city:"נתניה", budget:55000, source:"אינסטגרם", priority:"בינונית", status:"lost", notes:"עברה לספק אחר", date:"2025-03-20", assigned:"יוסי כ.", fb_msg:null },
  { id:7, name:"מושה פרץ", phone:"052-6667788", email:"moshe@gmail.com", city:"ראשון לציון", budget:95000, source:"המלצה", priority:"גבוהה", status:"design", notes:"מטבח + פינת אוכל", date:"2025-04-05", assigned:"רותי מ.", fb_msg:null },
];

const FB_INBOX_SEED = [
  { id:"fb1", from:"רחל גולן", msg:"שלום, ראיתי את העמוד שלכם ומחפשת מטבח חדש לבית. יש לכם דוגמאות?", time:"לפני 5 דקות", imported:false },
  { id:"fb2", from:"דוד שמואלי", msg:"היי! כמה עולה מטבח ממוצע אצלכם? יש לי תקציב של כ-70,000 ₪", time:"לפני 12 דקות", imported:false },
  { id:"fb3", from:"מרים לוינסון", msg:"בקשה לפרטים על מטבחי U. גרה בכפר יונה", time:"לפני 28 דקות", imported:false },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
async function loadLeads() {
  try {
    const r = await window.storage.get(STORAGE_KEY, true);
    return r ? JSON.parse(r.value) : SEED_LEADS;
  } catch { return SEED_LEADS; }
}
async function saveLeads(leads) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(leads), true); } catch {}
}

// ─── AI helper ───────────────────────────────────────────────────────────────
async function callClaude(messages, system = "") {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      system: system || "אתה עוזר CRM חכם לחברת מטבחים ישראלית. ענה תמיד בעברית, בצורה קצרה ומקצועית.",
      messages,
    })
  });
  const d = await res.json();
  return d.content?.find(b=>b.type==="text")?.text || "";
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Heebo',var(--font-sans);direction:rtl}
.app{display:flex;height:100vh;min-height:600px;background:var(--color-background-tertiary);overflow:hidden}
.sidebar{width:210px;background:var(--color-background-primary);border-left:0.5px solid var(--color-border-tertiary);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
.logo{padding:18px 16px;border-bottom:0.5px solid var(--color-border-tertiary)}
.logo h1{font-size:14px;font-weight:600;color:var(--color-text-primary)}
.logo p{font-size:11px;color:var(--color-text-secondary);margin-top:2px}
.nav{flex:1;padding:8px 0;overflow-y:auto}
.nav-item{display:flex;align-items:center;gap:9px;padding:9px 16px;cursor:pointer;font-size:13px;color:var(--color-text-secondary);border-right:3px solid transparent;transition:all .15s;position:relative}
.nav-item:hover{background:var(--color-background-secondary);color:var(--color-text-primary)}
.nav-item.active{background:var(--color-background-secondary);color:#185FA5;border-right-color:#185FA5;font-weight:500}
.nav-sep{height:0.5px;background:var(--color-border-tertiary);margin:8px 16px}
.badge-dot{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:7px;height:7px;border-radius:50%;background:#E24B4A}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0}
.topbar h2{font-size:14px;font-weight:600;color:var(--color-text-primary);white-space:nowrap}
.topbar-right{display:flex;gap:8px;align-items:center}
.search{padding:6px 12px;font-size:13px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:var(--color-background-secondary);color:var(--color-text-primary);width:190px;direction:rtl}
.search:focus{outline:none;border-color:#185FA5}
.btn{padding:6px 14px;font-size:13px;font-weight:500;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);cursor:pointer;background:transparent;color:var(--color-text-primary);transition:all .15s;font-family:inherit}
.btn:hover{background:var(--color-background-secondary)}
.btn.primary{background:#185FA5;color:#fff;border-color:#185FA5}
.btn.primary:hover{background:#0C447C}
.btn.danger{color:#A32D2D;border-color:transparent}
.btn.danger:hover{background:#FCEBEB}
.btn.sm{padding:4px 10px;font-size:12px}
.btn.ghost{border-color:transparent}
.btn.ghost:hover{background:var(--color-background-secondary)}
.content{flex:1;padding:18px 20px;overflow-y:auto}
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.kpi{background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:14px}
.kpi-label{font-size:11px;color:var(--color-text-secondary);margin-bottom:5px}
.kpi-val{font-size:22px;font-weight:600;color:var(--color-text-primary)}
.kpi-sub{font-size:11px;color:var(--color-text-secondary);margin-top:3px}
.dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.card{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:16px}
.card h3{font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:12px;text-transform:uppercase;letter-spacing:.04em}
.funnel-row{margin-bottom:8px}
.funnel-top{display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;color:var(--color-text-secondary)}
.funnel-track{height:6px;background:var(--color-background-secondary);border-radius:3px;overflow:hidden}
.funnel-fill{height:100%;border-radius:3px;background:#185FA5;transition:width .4s}
.activity-row{display:flex;gap:9px;padding:7px 0;border-bottom:0.5px solid var(--color-border-tertiary);font-size:12px}
.activity-row:last-child{border:none}
.dot{width:5px;height:5px;border-radius:50%;background:#185FA5;margin-top:5px;flex-shrink:0}
.act-time{color:var(--color-text-secondary);font-size:11px;margin-top:2px}
.filter-bar{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.fbtn{padding:4px 11px;font-size:12px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);cursor:pointer;background:transparent;color:var(--color-text-secondary);font-family:inherit}
.fbtn.active{background:var(--color-background-secondary);color:var(--color-text-primary);font-weight:500}
.table-wrap{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden}
table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
thead{background:var(--color-background-secondary)}
th{padding:9px 12px;text-align:right;font-weight:500;font-size:11px;color:var(--color-text-secondary);border-bottom:0.5px solid var(--color-border-tertiary)}
td{padding:9px 12px;color:var(--color-text-primary);border-bottom:0.5px solid var(--color-border-tertiary);vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--color-background-secondary)}
.sbadge{display:inline-block;padding:2px 8px;border-radius:var(--border-radius-md);font-size:11px;font-weight:500}
.s-new{background:#E6F1FB;color:#0C447C}.s-contact{background:#FAEEDA;color:#633806}
.s-design{background:#EAF3DE;color:#27500A}.s-offer{background:#EEEDFE;color:#3C3489}
.s-closed{background:#EAF3DE;color:#177a3c}.s-lost{background:#FCEBEB;color:#791F1F}
.ph{color:#A32D2D;font-size:11px;font-weight:500}
.pm{color:#854F0B;font-size:11px;font-weight:500}
.pl{color:#3B6D11;font-size:11px;font-weight:500}
.kanban{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;align-items:flex-start}
.kcol{min-width:195px;flex:1}
.khdr{padding:9px 12px;font-size:12px;font-weight:500;color:var(--color-text-secondary);display:flex;justify-content:space-between;align-items:center}
.kcnt{display:flex;flex-direction:column;gap:8px;min-height:60px}
.kcard{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:10px 12px;cursor:pointer;font-size:12px}
.kcard:hover{border-color:var(--color-border-secondary)}
.kname{font-weight:500;font-size:13px;color:var(--color-text-primary);margin-bottom:3px}
.kmeta{color:var(--color-text-secondary);display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.fb-tag{display:inline-flex;align-items:center;gap:3px;background:#E6F1FB;color:#0C447C;font-size:10px;padding:1px 6px;border-radius:10px;margin-top:4px}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:200}
.modal{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);width:540px;max-width:95vw;max-height:88vh;overflow-y:auto;padding:22px;direction:rtl}
.modal-title{font-size:15px;font-weight:600;margin-bottom:18px;color:var(--color-text-primary)}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ffield{display:flex;flex-direction:column;gap:4px}
.ffield.full{grid-column:1/-1}
.flabel{font-size:11px;color:var(--color-text-secondary);font-weight:500}
.finput{padding:7px 10px;font-size:13px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:var(--color-background-secondary);color:var(--color-text-primary);direction:rtl;font-family:inherit}
.finput:focus{outline:none;border-color:#185FA5}
.modal-foot{display:flex;gap:8px;margin-top:18px;align-items:center}
.fb-inbox{display:flex;flex-direction:column;gap:10px}
.fb-msg-card{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:14px}
.fb-msg-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.fb-sender{font-weight:500;font-size:14px;color:var(--color-text-primary)}
.fb-time{font-size:11px;color:var(--color-text-secondary)}
.fb-text{font-size:13px;color:var(--color-text-secondary);line-height:1.6;margin-bottom:10px}
.fb-actions{display:flex;gap:8px;align-items:center}
.imported-tag{font-size:11px;color:#3B6D11;background:#EAF3DE;padding:2px 8px;border-radius:var(--border-radius-md)}
.ai-center{display:flex;flex-direction:column;gap:16px}
.ai-tabs{display:flex;gap:0;border-bottom:0.5px solid var(--color-border-tertiary);margin-bottom:16px}
.ai-tab{padding:8px 16px;font-size:13px;cursor:pointer;color:var(--color-text-secondary);border-bottom:2px solid transparent;margin-bottom:-0.5px;font-family:inherit;background:none;border-top:none;border-left:none;border-right:none}
.ai-tab.active{color:#185FA5;border-bottom-color:#185FA5;font-weight:500}
.ai-tab:hover{color:var(--color-text-primary)}
.ai-box{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:16px}
.ai-result{margin-top:14px;padding:14px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);font-size:13px;line-height:1.8;color:var(--color-text-primary);white-space:pre-wrap}
.chat-messages{display:flex;flex-direction:column;gap:10px;max-height:340px;overflow-y:auto;padding:4px 0}
.chat-msg{display:flex;gap:8px}
.chat-msg.user{flex-direction:row-reverse}
.chat-bubble{padding:10px 14px;border-radius:var(--border-radius-lg);font-size:13px;line-height:1.6;max-width:80%}
.chat-msg.ai .chat-bubble{background:var(--color-background-secondary);color:var(--color-text-primary)}
.chat-msg.user .chat-bubble{background:#185FA5;color:#fff}
.chat-input-row{display:flex;gap:8px;margin-top:12px}
.chat-input{flex:1;padding:9px 12px;font-size:13px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:var(--color-background-secondary);color:var(--color-text-primary);direction:rtl;font-family:inherit}
.chat-input:focus{outline:none;border-color:#185FA5}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid var(--color-border-secondary);border-top-color:#185FA5;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.lead-sel{padding:7px 10px;font-size:13px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:var(--color-background-secondary);color:var(--color-text-primary);direction:rtl;font-family:inherit;width:100%}
.lead-sel:focus{outline:none;border-color:#185FA5}
.reports-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.sync-bar{font-size:11px;color:var(--color-text-secondary);padding:4px 10px;background:var(--color-background-secondary);border-bottom:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;gap:6px}
.green-dot{width:6px;height:6px;border-radius:50%;background:#3B6D11;flex-shrink:0}
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ s }) {
  const cls = { new:"s-new", contact:"s-contact", design:"s-design", offer:"s-offer", closed:"s-closed", lost:"s-lost" };
  return <span className={`sbadge ${cls[s]}`}>{STATUS_LABELS[s]}</span>;
}
function PrioBadge({ p }) {
  const cls = p==="גבוהה"?"ph":p==="נמוכה"?"pl":"pm";
  return <span className={cls}>{p}</span>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ leads }) {
  const total = leads.length;
  const active = leads.filter(l=>!["closed","lost"].includes(l.status)).length;
  const closed = leads.filter(l=>l.status==="closed").length;
  const rev = leads.filter(l=>l.status==="closed").reduce((s,l)=>s+l.budget,0);
  const counts = {};
  STATUS_ORDER.forEach(s => counts[s] = leads.filter(l=>l.status===s).length);
  const maxC = Math.max(...Object.values(counts), 1);
  const acts = [
    {text:"דנה לוי עברה לשלב הצעת מחיר", time:"לפני שעה"},
    {text:"ליד חדש מפייסבוק: דוד שמואלי", time:"לפני 12 דקות"},
    {text:"מושה פרץ: פגישה תכנון נקבעה", time:"לפני 5 שעות"},
    {text:"שרית מזרחי - עסקה נסגרה!", time:"אתמול"},
  ];
  return <>
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">סה"כ לידים</div><div className="kpi-val">{total}</div><div className="kpi-sub">כל הזמנים</div></div>
      <div className="kpi"><div className="kpi-label">לידים פעילים</div><div className="kpi-val">{active}</div><div className="kpi-sub">בטיפול</div></div>
      <div className="kpi"><div className="kpi-label">עסקאות סגורות</div><div className="kpi-val">{closed}</div><div className="kpi-sub">החודש</div></div>
      <div className="kpi"><div className="kpi-label">הכנסות צפויות</div><div className="kpi-val">₪{Math.round(rev/1000)}K</div><div className="kpi-sub">עסקאות סגורות</div></div>
    </div>
    <div className="dash-grid">
      <div className="card">
        <h3>משפך מכירות</h3>
        {STATUS_ORDER.map(s=><div key={s} className="funnel-row">
          <div className="funnel-top"><span>{STATUS_LABELS[s]}</span><span>{counts[s]}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(counts[s]/maxC*100)}%`}}/></div>
        </div>)}
      </div>
      <div className="card">
        <h3>פעילות אחרונה</h3>
        {acts.map((a,i)=><div key={i} className="activity-row">
          <div className="dot"/>
          <div><div style={{fontSize:12,color:"var(--color-text-primary)"}}>{a.text}</div><div className="act-time">{a.time}</div></div>
        </div>)}
      </div>
    </div>
  </>;
}

// ─── Leads Table ──────────────────────────────────────────────────────────────
function LeadsTable({ leads, onEdit }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const list = leads.filter(l => {
    const mq = !q || l.name.includes(q) || l.city.includes(q) || l.phone.includes(q);
    const ms = filter==="all" || l.status===filter;
    return mq && ms;
  });
  return <>
    <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
      <input className="search" placeholder="חיפוש..." value={q} onChange={e=>setQ(e.target.value)} style={{width:180}}/>
      <div className="filter-bar" style={{margin:0}}>
        {["all",...STATUS_ORDER].map(s=><button key={s} className={`fbtn${filter===s?" active":""}`} onClick={()=>setFilter(s)}>{s==="all"?"הכל":STATUS_LABELS[s]}</button>)}
      </div>
    </div>
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th style={{width:"20%"}}>לקוח</th><th style={{width:"13%"}}>טלפון</th>
          <th style={{width:"11%"}}>תקציב</th><th style={{width:"13%"}}>שלב</th>
          <th style={{width:"9%"}}>עדיפות</th><th style={{width:"11%"}}>מקור</th>
          <th style={{width:"11%"}}>נציג</th><th style={{width:"9%"}}>תאריך</th><th style={{width:"3%"}}></th>
        </tr></thead>
        <tbody>
          {list.length===0 && <tr><td colSpan={9} style={{textAlign:"center",color:"var(--color-text-secondary)",padding:24}}>אין לידים</td></tr>}
          {list.map(l=><tr key={l.id} style={{cursor:"pointer"}} onClick={()=>onEdit(l)}>
            <td><div style={{fontWeight:500}}>{l.name}</div><div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{l.city}{l.fb_msg?" · 📘":""}</div></td>
            <td>{l.phone}</td>
            <td>₪{l.budget.toLocaleString()}</td>
            <td><StatusBadge s={l.status}/></td>
            <td><PrioBadge p={l.priority}/></td>
            <td style={{color:"var(--color-text-secondary)",fontSize:12}}>{l.source}</td>
            <td style={{color:"var(--color-text-secondary)",fontSize:12}}>{l.assigned||"—"}</td>
            <td style={{color:"var(--color-text-secondary)",fontSize:12}}>{l.date}</td>
            <td><button className="btn sm ghost" onClick={e=>{e.stopPropagation();onEdit(l);}}>✏️</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}

// ─── Kanban ───────────────────────────────────────────────────────────────────
function Kanban({ leads, onEdit }) {
  const cols = STATUS_ORDER.filter(s=>s!=="lost");
  return <div className="kanban">
    {cols.map(s=>{
      const cards = leads.filter(l=>l.status===s);
      return <div key={s} className="kcol">
        <div className="khdr">{STATUS_LABELS[s]}<span style={{fontSize:11,background:"var(--color-background-secondary)",borderRadius:10,padding:"1px 7px"}}>{cards.length}</span></div>
        <div className="kcnt">
          {cards.map(l=><div key={l.id} className="kcard" onClick={()=>onEdit(l)}>
            <div className="kname">{l.name}</div>
            <div style={{color:"var(--color-text-secondary)",fontSize:11}}>{l.city} · {l.source}</div>
            {l.fb_msg && <div className="fb-tag">📘 פייסבוק</div>}
            <div className="kmeta">
              <span style={{fontWeight:500,fontSize:12}}>₪{Math.round(l.budget/1000)}K</span>
              <PrioBadge p={l.priority}/>
            </div>
          </div>)}
        </div>
      </div>;
    })}
  </div>;
}

// ─── Facebook Inbox ───────────────────────────────────────────────────────────
function FacebookInbox({ onImport, fbMsgs, setFbMsgs }) {
  const [simulating, setSimulating] = useState(false);

  function simulateNew() {
    setSimulating(true);
    setTimeout(()=>{
      const newMsg = {
        id:`fb${Date.now()}`,
        from:`משתמש פייסבוק ${Math.floor(Math.random()*900+100)}`,
        msg:`שלום! ראיתי את הפוסט שלכם על מטבחים. אני מחפש${Math.random()>.5?"ת":""} מטבח ל${["בית פרטי","דירה","דופלקס"][Math.floor(Math.random()*3)]}. האם אפשר לקבל פרטים?`,
        time:"כרגע",
        imported:false,
      };
      setFbMsgs(prev=>[newMsg,...prev]);
      setSimulating(false);
    },1200);
  }

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div>
        <div style={{fontWeight:500,fontSize:14,color:"var(--color-text-primary)"}}>📘 תיבת הודעות פייסבוק</div>
        <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>הודעות שמגיעות לעמוד העסקי</div>
      </div>
      <button className="btn sm" onClick={simulateNew} disabled={simulating}>
        {simulating ? <span className="spinner"/> : "+ סמלץ הודעה חדשה"}
      </button>
    </div>
    <div className="fb-inbox">
      {fbMsgs.map(m=><div key={m.id} className="fb-msg-card">
        <div className="fb-msg-header">
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"#E6F1FB",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:14,color:"#185FA5",flexShrink:0}}>
              {m.from[0]}
            </div>
            <div>
              <div className="fb-sender">{m.from}</div>
              <div className="fb-time">{m.time}</div>
            </div>
          </div>
          {m.imported && <span className="imported-tag">✓ נוסף ל-CRM</span>}
        </div>
        <div className="fb-text">{m.msg}</div>
        {!m.imported && <div className="fb-actions">
          <button className="btn sm primary" onClick={()=>onImport(m)}>הוסף ל-CRM</button>
          <button className="btn sm" onClick={()=>setFbMsgs(prev=>prev.map(x=>x.id===m.id?{...x,imported:true}:x))}>התעלם</button>
        </div>}
      </div>)}
    </div>
  </div>;
}

// ─── AI Center ────────────────────────────────────────────────────────────────
function AICenter({ leads }) {
  const [tab, setTab] = useState("analyze");
  const [selId, setSelId] = useState(leads[0]?.id||null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([{role:"ai",text:"שלום! אני העוזר ה-AI של מערכת CRM המטבחים. אוכל לנתח לידים, לתת המלצות אסטרטגיות, ולעזור לכם לסגור יותר עסקאות. במה אוכל לעזור?"}]);
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef(null);

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[chatMsgs]);

  async function analyzeLead() {
    if(!selId) return;
    const lead = leads.find(l=>l.id===selId);
    setLoading(true); setResult("");
    const prompt = `נתח את הליד הבא ותן המלצות מקצועיות:
שם: ${lead.name} | עיר: ${lead.city} | תקציב: ₪${lead.budget.toLocaleString()} | שלב: ${STATUS_LABELS[lead.status]} | עדיפות: ${lead.priority} | מקור: ${lead.source} | הערות: ${lead.notes||"אין"} | הודעת פייסבוק: ${lead.fb_msg||"אין"}
תן: 1) הערכת פוטנציאל (1-10) 2) צעד הבא מומלץ 3) סיכון עיקרי 4) טיפ לסגירה`;
    const r = await callClaude([{role:"user",content:prompt}]);
    setResult(r); setLoading(false);
  }

  async function weeklySummary() {
    setLoading(true); setResult("");
    const summary = STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(" | ");
    const total = leads.reduce((s,l)=>s+l.budget,0);
    const r = await callClaude([{role:"user",content:`כתוב סיכום שבועי מקצועי של צוות המכירות. נתונים: ${summary}. סה"כ פוטנציאל: ₪${total.toLocaleString()}. לידים מפייסבוק: ${leads.filter(l=>l.fb_msg).length}. כלול: הישגים, אתגרים, ו-3 המלצות לשבוע הבא.`}]);
    setResult(r); setLoading(false);
  }

  async function sendChat() {
    if(!chatInput.trim()) return;
    const userMsg = chatInput; setChatInput("");
    setChatMsgs(prev=>[...prev,{role:"user",text:userMsg}]);
    setLoading(true);
    const ctx = `נתוני המערכת: ${leads.length} לידים. פוטנציאל כולל: ₪${leads.reduce((s,l)=>s+l.budget,0).toLocaleString()}. ${STATUS_ORDER.map(s=>`${STATUS_LABELS[s]}: ${leads.filter(l=>l.status===s).length}`).join(", ")}.`;
    const history = chatMsgs.filter(m=>m.role!=="ai"||chatMsgs.indexOf(m)>0).map(m=>({role:m.role==="user"?"user":"assistant",content:m.text}));
    const r = await callClaude([...history,{role:"user",content:`${ctx}\n\nשאלה: ${userMsg}`}]);
    setChatMsgs(prev=>[...prev,{role:"ai",text:r}]);
    setLoading(false);
  }

  return <div className="ai-center">
    <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",fontSize:12,color:"var(--color-text-secondary)"}}>
      🤖 מרכז ה-AI מחובר ל-Claude ומנתח את הנתונים בזמן אמת
    </div>
    <div className="ai-tabs">
      {[["analyze","ניתוח ליד"],["weekly","סיכום שבועי"],["chat","צ'אט חופשי"]].map(([v,l])=>
        <button key={v} className={`ai-tab${tab===v?" active":""}`} onClick={()=>{setTab(v);setResult("");}}>🧠 {l}</button>
      )}
    </div>

    {tab==="analyze" && <div className="ai-box">
      <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:"var(--color-text-primary)"}}>בחר ליד לניתוח</div>
      <select className="lead-sel" value={selId||""} onChange={e=>setSelId(Number(e.target.value))}>
        {leads.map(l=><option key={l.id} value={l.id}>{l.name} — {STATUS_LABELS[l.status]} — ₪{l.budget.toLocaleString()}</option>)}
      </select>
      <button className="btn primary" style={{marginTop:12}} onClick={analyzeLead} disabled={loading}>
        {loading?<span className="spinner"/>:"נתח ליד →"}
      </button>
      {result && <div className="ai-result">{result}</div>}
    </div>}

    {tab==="weekly" && <div className="ai-box">
      <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:12}}>קבל סיכום שבועי אוטומטי עם תובנות והמלצות</div>
      <button className="btn primary" onClick={weeklySummary} disabled={loading}>
        {loading?<span className="spinner"/>:"צור סיכום שבועי →"}
      </button>
      {result && <div className="ai-result">{result}</div>}
    </div>}

    {tab==="chat" && <div className="ai-box">
      <div className="chat-messages" ref={chatRef}>
        {chatMsgs.map((m,i)=><div key={i} className={`chat-msg ${m.role==="user"?"user":"ai"}`}>
          <div className="chat-bubble">{m.text}</div>
        </div>)}
        {loading && <div className="chat-msg ai"><div className="chat-bubble"><span className="spinner"/></div></div>}
      </div>
      <div className="chat-input-row">
        <input className="chat-input" placeholder="שאל שאלה על הלידים..." value={chatInput}
          onChange={e=>setChatInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} />
        <button className="btn primary" onClick={sendChat} disabled={loading||!chatInput.trim()}>שלח</button>
      </div>
    </div>}
  </div>;
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports({ leads }) {
  const bySource = {};
  leads.forEach(l=>{ bySource[l.source]=(bySource[l.source]||0)+1; });
  const sorted = Object.entries(bySource).sort((a,b)=>b[1]-a[1]);
  const maxS = sorted[0]?.[1]||1;
  const byPrio = {גבוהה:0,בינונית:0,נמוכה:0};
  leads.forEach(l=>byPrio[l.priority]++);
  const totalBudget = leads.filter(l=>l.status!=="lost").reduce((s,l)=>s+l.budget,0);

  return <>
    <div className="kpi-grid">
      <div className="kpi"><div className="kpi-label">פוטנציאל צבר</div><div className="kpi-val">₪{Math.round(totalBudget/1000)}K</div></div>
      <div className="kpi"><div className="kpi-label">אחוז סגירה</div><div className="kpi-val">{Math.round(leads.filter(l=>l.status==="closed").length/leads.length*100)}%</div></div>
      <div className="kpi"><div className="kpi-label">ממוצע תקציב</div><div className="kpi-val">₪{Math.round(leads.reduce((s,l)=>s+l.budget,0)/leads.length/1000)}K</div></div>
      <div className="kpi"><div className="kpi-label">לידי פייסבוק</div><div className="kpi-val">{leads.filter(l=>l.source==="פייסבוק").length}</div></div>
    </div>
    <div className="reports-grid">
      <div className="card">
        <h3>לידים לפי מקור</h3>
        {sorted.map(([src,cnt])=><div key={src} className="funnel-row">
          <div className="funnel-top"><span>{src}</span><span>{cnt}</span></div>
          <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(cnt/maxS*100)}%`}}/></div>
        </div>)}
      </div>
      <div className="card">
        <h3>תקציב לפי שלב</h3>
        {STATUS_ORDER.map(s=>{
          const b = leads.filter(l=>l.status===s).reduce((a,l)=>a+l.budget,0);
          return b>0?<div key={s} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <span style={{color:"var(--color-text-secondary)"}}>{STATUS_LABELS[s]}</span>
            <span style={{fontWeight:500}}>₪{Math.round(b/1000)}K</span>
          </div>:null;
        })}
        <div style={{marginTop:12,padding:"10px 0 0",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>לפי עדיפות</div>
          {Object.entries(byPrio).map(([p,c])=><div key={p} className="funnel-row">
            <div className="funnel-top"><span>{p}</span><span>{c}</span></div>
            <div className="funnel-track"><div className="funnel-fill" style={{width:`${Math.round(c/leads.length*100)}%`,background:p==="גבוהה"?"#A32D2D":p==="נמוכה"?"#3B6D11":"#854F0B"}}/></div>
          </div>)}
        </div>
      </div>
    </div>
  </>;
}

// ─── Lead Modal ───────────────────────────────────────────────────────────────
const EMPTY_LEAD = { name:"", phone:"", email:"", city:"", budget:"", source:"אתר אינטרנט", priority:"בינונית", status:"new", notes:"", assigned:"", fb_msg:null };

function LeadModal({ lead, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(lead ? {...lead, budget:String(lead.budget)} : EMPTY_LEAD);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const isEdit = !!lead;

  function submit() {
    if(!form.name.trim()) return alert("נא להזין שם");
    onSave({...form, budget:parseInt(form.budget)||0, date:form.date||new Date().toISOString().slice(0,10)});
  }

  return <div className="modal-bg" onClick={e=>e.target.className==="modal-bg"&&onClose()}>
    <div className="modal">
      <div className="modal-title">{isEdit?"עריכת ליד":"ליד חדש"}</div>
      {form.fb_msg && <div style={{background:"#E6F1FB",borderRadius:"var(--border-radius-md)",padding:"10px 12px",fontSize:13,marginBottom:14,color:"#0C447C"}}>
        📘 הודעת פייסבוק: {form.fb_msg}
      </div>}
      <div className="fgrid">
        {[["name","שם מלא","text"],["phone","טלפון","tel"],["email","אימייל","email"],["city","עיר","text"],["budget","תקציב (₪)","number"],["assigned","נציג אחראי","text"]].map(([k,l,t])=>
          <div key={k} className="ffield">
            <label className="flabel">{l}</label>
            <input className="finput" type={t} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={l}/>
          </div>
        )}
        {[["source","מקור",["אתר אינטרנט","המלצה","פייסבוק","אינסטגרם","יד2","Google","אחר"]],
          ["priority","עדיפות",["גבוהה","בינונית","נמוכה"]],
          ["status","שלב",STATUS_ORDER]].map(([k,l,opts])=>
          <div key={k} className="ffield">
            <label className="flabel">{l}</label>
            <select className="finput" value={form[k]} onChange={e=>set(k,e.target.value)}>
              {opts.map(o=><option key={o} value={o}>{k==="status"?STATUS_LABELS[o]:o}</option>)}
            </select>
          </div>
        )}
        <div className="ffield full">
          <label className="flabel">הערות</label>
          <textarea className="finput" rows={3} value={form.notes||""} onChange={e=>set("notes",e.target.value)} style={{resize:"vertical"}}/>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={submit}>שמור</button>
        <button className="btn" onClick={onClose}>ביטול</button>
        {isEdit && <button className="btn danger" style={{marginRight:"auto"}} onClick={()=>{if(window.confirm("למחוק ליד זה?"))onDelete(lead.id);}}>מחק</button>}
      </div>
    </div>
  </div>;
}

// ─── Facebook Import Modal ────────────────────────────────────────────────────
function FbImportModal({ msg, onSave, onClose }) {
  const [form, setForm] = useState({
    name: msg.from, phone:"", email:"", city:"", budget:"",
    source:"פייסבוק", priority:"בינונית", status:"new",
    notes:msg.msg, assigned:"", fb_msg:msg.msg
  });
  const set = (k,v)=>setForm(f=>({...f,[k]:v}));

  return <div className="modal-bg" onClick={e=>e.target.className==="modal-bg"&&onClose()}>
    <div className="modal">
      <div className="modal-title">📘 ייבוא ליד מפייסבוק</div>
      <div style={{background:"#E6F1FB",borderRadius:"var(--border-radius-md)",padding:"10px 12px",fontSize:13,marginBottom:14,color:"#0C447C"}}>
        <strong>{msg.from}</strong>: {msg.msg}
      </div>
      <div className="fgrid">
        {[["name","שם","text"],["phone","טלפון","tel"],["city","עיר","text"],["budget","תקציב משוער (₪)","number"]].map(([k,l,t])=>
          <div key={k} className="ffield">
            <label className="flabel">{l}</label>
            <input className="finput" type={t} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={l}/>
          </div>
        )}
        {[["priority","עדיפות",["גבוהה","בינונית","נמוכה"]],["assigned","נציג",["","יוסי כ.","רותי מ."]]].map(([k,l,opts])=>
          <div key={k} className="ffield">
            <label className="flabel">{l}</label>
            <select className="finput" value={form[k]} onChange={e=>set(k,e.target.value)}>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn primary" onClick={()=>{if(!form.name.trim())return alert("נא להזין שם");onSave({...form,budget:parseInt(form.budget)||0,date:new Date().toISOString().slice(0,10)});}}>הוסף ל-CRM</button>
        <button className="btn" onClick={onClose}>ביטול</button>
      </div>
    </div>
  </div>;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const PAGES = [
  ["dashboard","📊","לוח בקרה"],
  ["leads","👥","לידים"],
  ["kanban","📋","קנבן"],
  ["facebook","📘","פייסבוק"],
  ["ai","🤖","AI Center"],
  ["reports","📈","דוחות"],
];

export default function App() {
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null); // null | {type:"edit"|"new"|"fb", data?}
  const [fbMsgs, setFbMsgs] = useState(FB_INBOX_SEED);
  const [saving, setSaving] = useState(false);
  const [fbLead, setFbLead] = useState(null);
  const nextId = useRef(20);

  useEffect(()=>{ loadLeads().then(l=>{ setLeads(l); nextId.current=Math.max(...l.map(x=>x.id),10)+1; }); },[]);

  const persist = useCallback(async (newLeads)=>{
    setSaving(true);
    await saveLeads(newLeads);
    setTimeout(()=>setSaving(false),600);
  },[]);

  function addLead(form) {
    const lead = {...form, id:nextId.current++};
    const updated = [lead,...leads];
    setLeads(updated); persist(updated); setModal(null);
  }
  function updateLead(form) {
    const updated = leads.map(l=>l.id===form.id?form:l);
    setLeads(updated); persist(updated); setModal(null);
  }
  function deleteLead(id) {
    const updated = leads.filter(l=>l.id!==id);
    setLeads(updated); persist(updated); setModal(null);
  }
  function importFb(msg, form) {
    const lead = {...form, id:nextId.current++};
    const updatedLeads = [lead,...leads];
    setLeads(updatedLeads); persist(updatedLeads);
    setFbMsgs(prev=>prev.map(m=>m.id===msg.id?{...m,imported:true}:m));
    setFbLead(null);
  }

  const fbPending = fbMsgs.filter(m=>!m.imported).length;

  return <>
    <style>{css}</style>
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          <h1>🏠 מטבחי CRM</h1>
          <p>ניהול לידים · {leads.length} לקוחות</p>
        </div>
        <div className="nav">
          {PAGES.map(([id,icon,label])=><div key={id} className={`nav-item${page===id?" active":""}`} onClick={()=>setPage(id)}>
            <span>{icon}</span>{label}
            {id==="facebook" && fbPending>0 && <span className="badge-dot"/>}
          </div>)}
        </div>
      </div>
      <div className="main">
        <div className="sync-bar">
          <div className="green-dot"/>
          <span>שמירה משותפת פעילה · {saving?"שומר...":"מסונכרן"}</span>
        </div>
        <div className="topbar">
          <h2>{PAGES.find(p=>p[0]===page)?.[2]}</h2>
          <div className="topbar-right">
            <button className="btn primary" onClick={()=>setModal("new")}>+ ליד חדש</button>
          </div>
        </div>
        <div className="content">
          {page==="dashboard" && <Dashboard leads={leads}/>}
          {page==="leads" && <LeadsTable leads={leads} onEdit={l=>setModal({type:"edit",lead:l})}/>}
          {page==="kanban" && <Kanban leads={leads} onEdit={l=>setModal({type:"edit",lead:l})}/>}
          {page==="facebook" && <FacebookInbox fbMsgs={fbMsgs} setFbMsgs={setFbMsgs} onImport={msg=>setFbLead(msg)}/>}
          {page==="ai" && <AICenter leads={leads}/>}
          {page==="reports" && <Reports leads={leads}/>}
        </div>
      </div>
    </div>

    {modal==="new" && <LeadModal onSave={addLead} onClose={()=>setModal(null)}/>}
    {modal?.type==="edit" && <LeadModal lead={modal.lead} onSave={updateLead} onDelete={deleteLead} onClose={()=>setModal(null)}/>}
    {fbLead && <FbImportModal msg={fbLead} onSave={(form)=>importFb(fbLead,form)} onClose={()=>setFbLead(null)}/>}
  </>;
}

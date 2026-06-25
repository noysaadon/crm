import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

// מיפוי שמות עמודות נפוצות לשדות המערכת
const AUTO_MAP = {
  name: ['שם','שם מלא','שם לקוח','שם משפחה','לקוח'],
  phone: ['טלפון','נייד','מספר','טל','פלאפון','סלולרי'],
  city: ['עיר','יישוב','מקום'],
  address: ['כתובת','רחוב','מען'],
  kitchen_color: ['צבע','צבע מטבח','גוון'],
  marble_color: ['שיש','צבע שיש','משטח'],
  length_top: ['אורך למעלה','אורך עליון','למעלה'],
  length_bottom: ['אורך למטה','אורך תחתון','למטה'],
  closet_or_flap: ['קלאפות','ארון','קלאפות או ארון','סוג דלת'],
  drawers: ['מגירות','כמות מגירות'],
  drawers_position: ['מיקום מגירות'],
  sink_position: ['מיקום כיור','כיור'],
  kitchen_color_2: ['ידיות'],
  handles: ['ידיות','ידית','ידיות אינטגרלי'],
  led: ['לד','תאורה'],
  notes: ['הערות','תוספות','חיתוך','הערה'],
  price: ['מחיר','סכום','עלות'],
  deposit: ['מקדמה','מקדמה'],
  delivery_price: ['הובלה','התקנה','הובלה והתקנה','משלוח'],
  agent: ['סוכן','נציג','מוכר'],
  date: ['תאריך','תאריך הזמנה'],
}

const FIELD_LABELS = {
  name:'שם מלא', phone:'טלפון', city:'עיר', address:'כתובת',
  kitchen_color:'צבע מטבח', marble_color:'צבע שיש',
  length_top:"אורך למעלה", length_bottom:"אורך למטה",
  closet_or_flap:'קלאפות/ארון', drawers:'מגירות',
  drawers_position:'מיקום מגירות', sink_position:'מיקום כיור',
  handles:'ידיות', led:'לד', notes:'הערות',
  price:'מחיר', deposit:'מקדמה', delivery_price:'הובלה והתקנה',
  agent:'סוכן', date:'תאריך',
}

function detectMapping(headers) {
  const mapping = {}
  headers.forEach(header => {
    const h = (header||'').trim().toLowerCase()
    for (const [field, aliases] of Object.entries(AUTO_MAP)) {
      if (aliases.some(a => h.includes(a.toLowerCase()) || a.toLowerCase().includes(h))) {
        if (!Object.values(mapping).includes(field)) {
          mapping[header] = field
        }
      }
    }
  })
  return mapping
}

export default function ExcelImport({ onImport, onClose }) {
  const [step, setStep] = useState(1) // 1=upload, 2=map, 3=preview, 4=done
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState([])
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (data.length < 2) { alert('הקובץ ריק או לא תקין'); return }
      const hdrs = data[0].map(h => String(h).trim()).filter(h => h)
      const dataRows = data.slice(1).filter(row => row.some(cell => cell !== ''))
      setHeaders(hdrs)
      setRows(dataRows)
      setMapping(detectMapping(hdrs))
      setStep(2)
    }
    reader.readAsBinaryString(file)
  }

  function getMappedValue(row, field) {
    const header = Object.entries(mapping).find(([,f]) => f === field)?.[0]
    if (!header) return ''
    const idx = headers.indexOf(header)
    return idx >= 0 ? String(row[idx] || '').trim() : ''
  }

  async function doImport() {
    setImporting(true)
    setStep(4)
    let count = 0
    const errs = []
    for (const row of rows) {
      const lead = {
        name: getMappedValue(row, 'name'),
        phone: getMappedValue(row, 'phone'),
        city: getMappedValue(row, 'city'),
        address: getMappedValue(row, 'address'),
        kitchen_color: getMappedValue(row, 'kitchen_color'),
        marble_color: getMappedValue(row, 'marble_color'),
        length_top: parseFloat(getMappedValue(row, 'length_top')) || 0,
        length_bottom: parseFloat(getMappedValue(row, 'length_bottom')) || 0,
        closet_or_flap: getMappedValue(row, 'closet_or_flap') || 'קלפות',
        drawers: parseInt(getMappedValue(row, 'drawers')) || 0,
        drawers_position: getMappedValue(row, 'drawers_position') || 'שמאל',
        sink_position: getMappedValue(row, 'sink_position') || 'אמצע',
        handles: getMappedValue(row, 'handles'),
        led: getMappedValue(row, 'led'),
        notes: getMappedValue(row, 'notes'),
        price: parseFloat(String(getMappedValue(row, 'price')).replace(/[₪,]/g, '')) || 0,
        deposit: parseFloat(String(getMappedValue(row, 'deposit')).replace(/[₪,]/g, '')) || 0,
        delivery_price: parseFloat(String(getMappedValue(row, 'delivery_price')).replace(/[₪,]/g, '')) || 0,
        agent: getMappedValue(row, 'agent'),
        date: getMappedValue(row, 'date') || new Date().toISOString().slice(0,10),
        status: 'new',
        priority: 'בינונית',
        source: 'ייבוא אקסל',
        supplied: false,
      }
      if (!lead.name) { errs.push(`שורה ${rows.indexOf(row)+2}: חסר שם`); continue }
      const { error } = await onImport(lead)
      if (error) errs.push(`${lead.name}: ${error.message}`)
      else count++
      setImported(c => c + 1)
    }
    setErrors(errs)
    setImporting(false)
  }

  const css = `
    .xi-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:400;padding:20px}
    .xi-modal{background:#fff;border-radius:14px;width:720px;max-width:96vw;max-height:88vh;overflow-y:auto;padding:26px 28px;direction:rtl}
    .xi-title{font-size:16px;font-weight:600;margin-bottom:4px}
    .xi-sub{font-size:12px;color:#666;margin-bottom:20px}
    .xi-upload{border:2px dashed #ccc;border-radius:10px;padding:40px;text-align:center;cursor:pointer;transition:all .13s}
    .xi-upload:hover{border-color:#185FA5;background:#E6F1FB}
    .xi-table{width:100%;border-collapse:collapse;font-size:12px}
    .xi-table th{background:#f0efeb;padding:8px 10px;text-align:right;font-weight:600;font-size:10px;color:#666;text-transform:uppercase;border-bottom:1px solid #e0dfd8}
    .xi-table td{padding:7px 10px;border-bottom:1px solid #f0efeb;vertical-align:middle}
    .xi-sel{padding:5px 8px;font-size:12px;border:1px solid #ccc;border-radius:6px;background:#f8f8f8;font-family:inherit;direction:rtl;width:100%}
    .xi-steps{display:flex;gap:8px;margin-bottom:20px}
    .xi-step{flex:1;padding:8px;text-align:center;border-radius:8px;font-size:12px;font-weight:500}
    .xi-step.done{background:#EAF3DE;color:#27500A}
    .xi-step.active{background:#E6F1FB;color:#185FA5}
    .xi-step.todo{background:#f0efeb;color:#999}
    .xi-btn{padding:8px 18px;font-size:13px;font-weight:500;border:none;border-radius:8px;cursor:pointer;font-family:inherit}
    .xi-btn.primary{background:#185FA5;color:#fff}.xi-btn.primary:hover{background:#0C447C}
    .xi-btn.ghost{background:#f0efeb;color:#333}.xi-btn.ghost:hover{background:#e0dfd8}
    .xi-progress{height:8px;background:#f0efeb;border-radius:4px;overflow:hidden;margin:12px 0}
    .xi-progress-fill{height:100%;background:#185FA5;border-radius:4px;transition:width .3s}
    .xi-mapped{display:inline-flex;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:#EAF3DE;color:#27500A}
    .xi-unmapped{display:inline-flex;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:#FAEEDA;color:#633806}
  `

  const steps = ['העלאת קובץ','מיפוי עמודות','תצוגה מקדימה','ייבוא']

  return <>
    <style>{css}</style>
    <div className="xi-overlay" onClick={e=>e.target.className==='xi-overlay'&&onClose()}>
      <div className="xi-modal">
        <div className="xi-title">📊 ייבוא לידים מאקסל</div>
        <div className="xi-sub">העלה קובץ Excel — שורה 1 = כותרות עמודות, משורה 2 = נתונים</div>

        <div className="xi-steps">
          {steps.map((s,i)=><div key={i} className={`xi-step ${i+1<step?'done':i+1===step?'active':'todo'}`}>
            {i+1<step?'✓ ':''}{s}
          </div>)}
        </div>

        {/* שלב 1 — העלאה */}
        {step===1&&<>
          <div className="xi-upload" onClick={()=>fileRef.current?.click()}>
            <div style={{fontSize:36,marginBottom:10}}>📂</div>
            <div style={{fontSize:14,fontWeight:500,marginBottom:6}}>לחץ לבחירת קובץ Excel</div>
            <div style={{fontSize:12,color:'#888'}}>תומך ב-XLS, XLSX, CSV</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFile}/>
        </>}

        {/* שלב 2 — מיפוי */}
        {step===2&&<>
          <div style={{marginBottom:12,fontSize:13,color:'#666'}}>
            נמצאו <strong>{rows.length}</strong> שורות · <strong>{headers.length}</strong> עמודות
            <br/>המערכת זיהתה אוטומטית {Object.keys(mapping).length} עמודות. ניתן לתקן ידנית:
          </div>
          <table className="xi-table">
            <thead><tr>
              <th>עמודה באקסל</th>
              <th>דוגמה מהנתונים</th>
              <th>ממופה לשדה</th>
            </tr></thead>
            <tbody>
              {headers.map(h=>{
                const example = rows[0]?.[headers.indexOf(h)] || ''
                const mapped = mapping[h] || ''
                return <tr key={h}>
                  <td style={{fontWeight:500}}>{h}</td>
                  <td style={{color:'#666',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{String(example)}</td>
                  <td>
                    <select className="xi-sel" value={mapped} onChange={e=>setMapping(m=>({...m,[h]:e.target.value||null}))}>
                      <option value="">— לא לייבא —</option>
                      {Object.entries(FIELD_LABELS).map(([f,l])=><option key={f} value={f}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              })}
            </tbody>
          </table>
          <div style={{display:'flex',gap:8,marginTop:16}}>
            <button className="xi-btn primary" onClick={()=>setStep(3)}>המשך לתצוגה מקדימה ←</button>
            <button className="xi-btn ghost" onClick={()=>setStep(1)}>← חזרה</button>
          </div>
        </>}

        {/* שלב 3 — תצוגה מקדימה */}
        {step===3&&<>
          <div style={{marginBottom:12,fontSize:13,color:'#666'}}>
            תצוגה מקדימה — 5 שורות ראשונות מתוך <strong>{rows.length}</strong>:
          </div>
          <div style={{overflowX:'auto',marginBottom:16}}>
            <table className="xi-table">
              <thead><tr>
                {Object.entries(FIELD_LABELS).filter(([f])=>Object.values(mapping).includes(f)).map(([f,l])=><th key={f}>{l}</th>)}
              </tr></thead>
              <tbody>
                {rows.slice(0,5).map((row,ri)=><tr key={ri}>
                  {Object.entries(FIELD_LABELS).filter(([f])=>Object.values(mapping).includes(f)).map(([f])=><td key={f} style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{getMappedValue(row,f)}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
          <div style={{background:'#E6F1FB',borderRadius:8,padding:'10px 14px',fontSize:13,marginBottom:16,color:'#0C447C'}}>
            ✅ מוכן לייבוא <strong>{rows.length}</strong> לקוחות
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="xi-btn primary" onClick={doImport}>🚀 התחל ייבוא ({rows.length} שורות)</button>
            <button className="xi-btn ghost" onClick={()=>setStep(2)}>← חזרה למיפוי</button>
          </div>
        </>}

        {/* שלב 4 — ייבוא */}
        {step===4&&<>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            {importing
              ?<><div style={{fontSize:14,fontWeight:500,marginBottom:12}}>מייבא... {imported}/{rows.length}</div>
                <div className="xi-progress"><div className="xi-progress-fill" style={{width:`${Math.round(imported/rows.length*100)}%`}}/></div>
                <div style={{fontSize:12,color:'#666'}}>אנא המתן, אל תסגר את הדף</div>
              </>
              :<>
                <div style={{fontSize:28,marginBottom:10}}>🎉</div>
                <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>הייבוא הושלם!</div>
                <div style={{fontSize:14,color:'#3B6D11',marginBottom:16}}>
                  יובאו בהצלחה: <strong>{imported - errors.length}</strong> לקוחות
                </div>
                {errors.length>0&&<div style={{background:'#FCEBEB',borderRadius:8,padding:12,fontSize:12,color:'#A32D2D',marginBottom:16,textAlign:'right'}}>
                  <div style={{fontWeight:600,marginBottom:6}}>שגיאות ({errors.length}):</div>
                  {errors.map((e,i)=><div key={i}>{e}</div>)}
                </div>}
                <button className="xi-btn primary" onClick={onClose}>סגור וראה לקוחות</button>
              </>}
          </div>
        </>}

        {step < 4 && <div style={{marginTop:16,borderTop:'1px solid #f0efeb',paddingTop:12,textAlign:'left'}}>
          <button className="xi-btn ghost" onClick={onClose} style={{fontSize:12}}>✕ ביטול</button>
        </div>}
      </div>
    </div>
  </>
}

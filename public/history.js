import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase, ref, query, limitToLast, onChildAdded } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

async function loadConfig(){ const r=await fetch('/config.json'); if(!r.ok) throw new Error('Missing /config.json'); return r.json(); }
function getUnitId(defaultUnit){ const p=new URLSearchParams(location.search); return p.get('unit') || defaultUnit || 'Home-56TS'; }

// Parse keys like "YYYY-MM-DD_HH:MM:SS" as UTC -> ms
function parseKeyAsUTC(key){
  const m = key && key.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2}):(\d{2}):(\d{2})$/);
  if(!m) return null;
  const [_, Y, M, D, h, mi, s] = m.map(Number);
  return Date.UTC(Y, M-1, D, h, mi, s);
}

const TZ = "America/New_York";

function render(list, rows){
  list.innerHTML='';
  rows.sort((a,b)=> (b.tsMs ?? 0) - (a.tsMs ?? 0)); // newest first
  for(const v of rows){
    const s=Number(v.supply), r=Number(v.return);
    const dt=Math.abs(Number.isFinite(Number(v.delta)) ? Number(v.delta) : (s - r));
    const label = v.tsMs ? new Date(v.tsMs).toLocaleString(undefined, { timeZone: TZ, timeZoneName: 'short' }) : '';
    list.insertAdjacentHTML('beforeend', `
      <div class="row">
        <div style="display:flex;gap:8px;align-items:baseline;">
          <strong style="font-size:20px;">${Number.isFinite(dt)?dt.toFixed(0):'--'}°F</strong>
          <span class="muted">${label}</span>
        </div>
        <div class="muted">Supply: ${Number.isFinite(s)?s.toFixed(0):'--'}°F • Return: ${Number.isFinite(r)?r.toFixed(0):'--'}°F • ${v.status ?? ''}</div>
      </div>
    `);
  }
}

loadConfig().then(cfg=>{
  const { firebase, defaultUnit } = cfg;
  const app = initializeApp(firebase);
  const db  = getDatabase(app);
  const auth= getAuth(app);

  const unitId = getUnitId(defaultUnit);
  document.getElementById('unit').textContent = `• ${unitId}`;
  document.getElementById('backLink').href = `/?unit=${encodeURIComponent(unitId)}`;

  const list = document.getElementById('list');
  const rows = [];

  signInAnonymously(auth);
  onAuthStateChanged(auth, ()=>{
    const q = query(ref(db, `units/${unitId}/logs`), limitToLast(500));
    onChildAdded(q, snap => {
      const val = snap.val() || {};
      // Prefer numeric ts; else parse key as UTC and convert to local on display
      const tsMs = typeof val.ts === 'number' ? val.ts : parseKeyAsUTC(snap.key);
      rows.push({ key: snap.key, tsMs, ...val });
      render(list, rows);
    });
  });
}).catch(err=>{
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:red">${err.message}</pre>`);
});

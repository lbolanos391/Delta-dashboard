import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase, ref, query, limitToLast, onChildAdded } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

async function loadConfig(){ const r=await fetch('/config.json'); if(!r.ok) throw new Error('Missing /config.json'); return r.json(); }
function getUnitId(defaultUnit){ const p=new URLSearchParams(location.search); return p.get('unit') || defaultUnit || 'Home-56TS'; }

function render(list, rows){
  list.innerHTML='';
  rows.sort((a,b)=> (b.ts ?? 0) - (a.ts ?? 0)); // newest first
  for(const v of rows){
    const s=Number(v.supply), r=Number(v.return);
    const dt=Math.abs(Number.isFinite(Number(v.delta)) ? Number(v.delta) : (s - r));
    const ts=v.ts ? new Date(v.ts).toLocaleString() : '';
    list.insertAdjacentHTML('beforeend', `
      <div class="row">
        <div style="display:flex;gap:8px;align-items:baseline;">
          <strong style="font-size:20px;">${Number.isFinite(dt)?dt.toFixed(0):'--'}°F</strong>
          <span class="muted">${ts}</span>
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
      rows.push({ key: snap.key, ...snap.val() });
      render(list, rows);
    });
  });
}).catch(err=>{
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:red">${err.message}</pre>`);
});

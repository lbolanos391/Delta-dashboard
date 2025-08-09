import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase, ref, query, limitToLast, onValue } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

async function loadConfig() {
  const res = await fetch('/config.json');
  if (!res.ok) throw new Error('Missing /config.json');
  return res.json();
}
function getUnitId(defaultUnit) {
  const params = new URLSearchParams(location.search);
  return params.get('unit') || defaultUnit || 'Home-56TS';
}
function rowHtml(v) {
  const s = Number(v.supply), r = Number(v.return);
  const dt = Math.abs(Number.isFinite(Number(v.delta)) ? Number(v.delta) : (s - r));
  const ts = v.ts ? new Date(v.ts).toLocaleString() : '';
  return `
    <div class="row">
      <div style="display:flex;gap:8px;align-items:baseline;">
        <strong style="font-size:20px;">${Number.isFinite(dt) ? dt.toFixed(0) : '--'}°F</strong>
        <span class="muted">${ts}</span>
      </div>
      <div class="muted">Supply: ${Number.isFinite(s)?s.toFixed(0):'--'}°F • Return: ${Number.isFinite(r)?r.toFixed(0):'--'}°F • ${v.status ?? ''}</div>
    </div>
  `;
}

loadConfig().then(cfg => {
  const { firebase, defaultUnit } = cfg;
  const app = initializeApp(firebase);
  const db  = getDatabase(app);
  const auth = getAuth(app);

  const unitId = getUnitId(defaultUnit);
  document.getElementById('unit').textContent = `• ${unitId}`;
  document.getElementById('backLink').href = `/?unit=${encodeURIComponent(unitId)}`;

  signInAnonymously(auth);
  onAuthStateChanged(auth, () => {
    // Increase history depth if you want (200 ≈ ~100 minutes at 30s/log)
    const logsRef = query(ref(db, `units/${unitId}/logs`), limitToLast(500));
    onValue(logsRef, (snap) => {
      const list = document.getElementById('list');
      list.innerHTML = '';
      const rows = [];
      snap.forEach(child => rows.push({ key: child.key, ...child.val() }));
      // Sort newest first by ts (falls back to 0 if missing)
      rows.sort((a,b) => (b.ts ?? 0) - (a.ts ?? 0));
      rows.forEach(v => list.insertAdjacentHTML('beforeend', rowHtml(v)));
    });
  });
}).catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:red">${err.message}</pre>`);
});

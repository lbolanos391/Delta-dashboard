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
function cardHtml(v) {
  const s = Number(v.supply);
  const r = Number(v.return);
  const dt = Math.abs(Number.isFinite(Number(v.delta)) ? Number(v.delta) : (s - r));
  const ts = v.ts ? new Date(v.ts).toLocaleString() : '';
  const sup = Number.isFinite(s) ? s.toFixed(0) : '--';
  const ret = Number.isFinite(r) ? r.toFixed(0) : '--';
  return `
    <div class="row">
      <div style="display:flex; gap:8px; align-items:baseline;">
        <strong style="font-size:20px;">${Number.isFinite(dt) ? dt.toFixed(0) : '--'}°F</strong>
        <span class="muted">${ts}</span>
      </div>
      <div class="muted">Supply: ${sup}°F • Return: ${ret}°F • ${v.status ?? ''}</div>
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
    const logsRef = query(ref(db, `units/${unitId}/logs`), limitToLast(200));
    onValue(logsRef, (snap) => {
      const list = document.getElementById('list');
      list.innerHTML = '';
      const rows = [];
      snap.forEach(child => rows.push({ key: child.key, ...child.val() }));
      rows.reverse().forEach(v => list.insertAdjacentHTML('beforeend', cardHtml(v)));
    });
  });
}).catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:red">${err.message}</pre>`);
});

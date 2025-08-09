import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

async function loadConfig() {
  const res = await fetch('/config.json');
  if (!res.ok) throw new Error('Missing /config.json');
  return res.json();
}

function getUnitId(defaultUnit) {
  const params = new URLSearchParams(location.search);
  return params.get('unit') || defaultUnit || 'Home-56TS';
}

function fmt(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(0) : '--';
}

const dtEl = document.getElementById('dt');
const statusEl = document.getElementById('status');
const supplyEl = document.getElementById('supply');
const returnEl = document.getElementById('return');
const updatedEl = document.getElementById('updated');

loadConfig().then(cfg => {
  const { firebase, defaultUnit } = cfg;
  const app = initializeApp(firebase);
  const db  = getDatabase(app);
  const auth = getAuth(app);

  const unitId = getUnitId(defaultUnit);
  document.getElementById('unit').textContent = `• ${unitId}`;
  document.getElementById('historyLink').href = `/history.html?unit=${encodeURIComponent(unitId)}`;

  signInAnonymously(auth);
  onAuthStateChanged(auth, (u) => {
    if (!u) return;
    const latestRef = ref(db, `units/${unitId}/latest`);
    onValue(latestRef, (snap) => {
      const v = snap.val() || {};
      const s = Number(v.supply ?? NaN);
      const r = Number(v.return ?? NaN);
      const dt = Math.abs(Number.isFinite(Number(v.delta)) ? Number(v.delta) : (s - r));

      dtEl.textContent = Number.isFinite(dt) ? dt.toFixed(0) : '--';
      statusEl.textContent = `Status: ${v.status ?? '--'}`;
      supplyEl.textContent = `Supply: ${fmt(s)} °F`;
      returnEl.textContent = `Return: ${fmt(r)} °F`;
      updatedEl.textContent = v.ts ? new Date(v.ts).toLocaleString() : '';
    });
  });
}).catch(err => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:red">${err.message}</pre>`);
});

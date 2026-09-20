'use strict';

const REPO = 'https://github.com/victoriano/medios-virales';
const PAGE = 25;
const PARTIDOS = ['PSOE', 'PP', 'Vox', 'Sumar', 'varios', 'ninguno'];
const CHIP = { PP: 'pp', PSOE: 'psoe', Vox: 'vox', Sumar: 'sumar', varios: 'otros', ninguno: 'otros' };
const DIRCHIP = { beneficia: 'ben', perjudica: 'perj', neutro: 'neu' };
const DIRTXT = { beneficia: 'beneficia', perjudica: 'perjudica', neutro: 'neutro' };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = n => new Intl.NumberFormat('es-ES').format(n || 0);
const esc = s => (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = f => { if (!f) return ''; const [y, m, d] = f.split('-'); return `${d}/${m}/${y}`; };
const compact = n => { n = n || 0; if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' M'; if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.', ',') + ' mil'; return nf(n); };

let INDEX = null;

/* ---------- navegación ---------- */
const VIEWS = ['ranking', 'medio', 'top', 'metodo'];
function show(v) {
  VIEWS.forEach(x => { $('#view-' + x).hidden = x !== v; });
  $$('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.view === v));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('.tab').forEach(t => t.addEventListener('click', () => {
  location.hash = '#/' + t.dataset.view;
}));
window.addEventListener('hashchange', route);
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h.startsWith('medio/')) { openMedio(h.slice(6)); return; }
  if (h === 'top') { show('top'); return; }
  if (h === 'metodo') { show('metodo'); return; }
  show('ranking');
}

/* ---------- cabecera / método ---------- */
function pintarTotales() {
  const t = INDEX.totales;
  $('#n-virales').textContent = nf(t.virales);
  $('#n-medios').textContent = t.medios;
  $('#m-gate').textContent = `${nf(t.gate_si)} claros, ${nf(t.gate_dudoso)} dudosos y ${nf(t.gate_no)} fuera`;
  $('#m-partido').textContent = PARTIDOS.filter(p => t.por_partido[p]).map(p => `${p} ${nf(t.por_partido[p])}`).join(' · ');
  $('#m-dir').textContent = Object.entries(t.por_direccion).map(([k, v]) => `${DIRTXT[k] || k} ${nf(v)}`).join(' · ');
  $('#m-fecha').textContent = INDEX.generado;
  $('#repo-link').href = REPO;
  $('#rank-note').textContent = `${t.medios} medios con algún tuit por encima de 100 retuits, de los ${t.medios_lista} de la lista. Censo del ${INDEX.ventana.desde} al ${INDEX.ventana.hasta}.`;
}

function pintarStats() {
  const t = INDEX.totales;
  const dist = PARTIDOS.map(p => ({ p, v: t.por_partido[p] || 0 })).filter(x => x.v);
  const totalP = dist.reduce((a, b) => a + b.v, 0);
  const dir = ['perjudica', 'neutro', 'beneficia'].map(d => ({ d, v: t.por_direccion[d] || 0 }));
  const totalD = dir.reduce((a, b) => a + b.v, 0);
  const color = { PP: 'var(--pp)', PSOE: 'var(--psoe)', Vox: 'var(--vox)', Sumar: 'var(--sumar)', varios: 'var(--otros)', ninguno: 'var(--otros)' };
  const cdir = { perjudica: 'var(--perj)', neutro: 'var(--neu)', beneficia: 'var(--ben)' };

  $('#stats').innerHTML = `
    <div class="card">
      <p class="k">Tuits virales</p><p class="v">${nf(t.virales)}</p>
      <p class="s">más de 100 retuits · ${t.medios} medios</p>
    </div>
    <div class="card">
      <p class="k">Con lectura política</p><p class="v">${nf(t.clasificados)}</p>
      <p class="s">${Math.round(100 * t.clasificados / t.virales)} % del total</p>
    </div>
    <div class="card">
      <p class="k">Partido más señalado</p><p class="v">PSOE</p>
      <p class="s">${nf(t.por_partido.PSOE)} tuits, ${Math.round(100 * t.por_partido.PSOE / totalP)} % de los políticos</p>
      <div class="bar">${dist.map(d => `<i style="width:${100 * d.v / totalP}%;background:${color[d.p]}"></i>`).join('')}</div>
      <div class="leyenda">${dist.map(d => `<span><i class="dot" style="background:${color[d.p]}"></i>${d.p} ${nf(d.v)}</span>`).join('')}</div>
    </div>
    <div class="card">
      <p class="k">Dirección</p><p class="v">${Math.round(100 * (t.por_direccion.perjudica || 0) / totalD)} % crítica</p>
      <p class="s">lo viral premia el conflicto</p>
      <div class="bar">${dir.map(d => `<i style="width:${100 * d.v / totalD}%;background:${cdir[d.d]}"></i>`).join('')}</div>
      <div class="leyenda">${dir.map(d => `<span><i class="dot" style="background:${cdir[d.d]}"></i>${DIRTXT[d.d]} ${nf(d.v)}</span>`).join('')}</div>
    </div>`;
}

/* ---------- ranking ---------- */
let sortKey = 'indice', sortDir = 1, query = '';

function pintarRanking() {
  const q = query.trim().toLowerCase();
  let rows = INDEX.medios.filter(m => !q || m.nombre.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q));
  rows = rows.slice().sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    if (typeof x === 'string') return sortDir * x.localeCompare(y);
    return sortDir * (x - y);
  });
  const tb = $('#tabla-ranking tbody');
  if (!rows.length) { tb.innerHTML = `<tr><td colspan="8" class="empty">Ningún medio coincide con esa búsqueda.</td></tr>`; return; }
  tb.innerHTML = rows.map(m => {
    const tot = m.izq + m.der;
    const w = tot ? { i: 100 * m.izq / tot, d: 100 * m.der / tot } : { i: 0, d: 0 };
    const cls = m.indice < -0.05 ? 'n' : m.indice > 0.05 ? 'p' : '';
    const txt = (m.indice > 0 ? '+' : m.indice < 0 ? '−' : '') + Math.abs(m.indice).toFixed(2);
    return `<tr data-h="${esc(m.handle)}">
      <td><div class="medio-cell"><div><div><strong>${esc(m.nombre)}</strong></div><div class="h">${esc(m.handle)} · ${compact(m.seguidores)} seguidores</div></div></div></td>
      <td class="num"><span class="idx-pill ${cls}">${txt}</span></td>
      <td><div class="mini"><i style="width:${w.i}%;background:var(--izq)"></i><i style="width:${w.d}%;background:var(--der)"></i></div></td>
      <td class="num">${nf(m.virales)}</td>
      <td class="num">${nf(m.politicos)}</td>
      <td class="num c-izq">${nf(m.izq)}</td>
      <td class="num c-der">${nf(m.der)}</td>
      <td class="num c-rt">${nf(m.rt_mediana)}</td>
    </tr>`;
  }).join('');
  $$('#tabla-ranking thead th[data-sort]').forEach(th => {
    th.classList.toggle('sel', th.dataset.sort === sortKey);
    th.querySelector('.arrow').textContent = th.dataset.sort === sortKey ? (sortDir > 0 ? '▲' : '▼') : '▲';
  });
}
$$('#tabla-ranking thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
  const k = th.dataset.sort;
  if (k === sortKey) sortDir *= -1; else { sortKey = k; sortDir = k === 'indice' ? 1 : -1; }
  pintarRanking();
}));
$('#tabla-ranking tbody').addEventListener('click', e => {
  const tr = e.target.closest('tr[data-h]');
  if (tr) location.hash = '#/medio/' + tr.dataset.h.replace('@', '');
});
$('#q').addEventListener('input', e => { query = e.target.value; pintarRanking(); });

/* ---------- ficha de un medio ---------- */
let MEDIO = null, mSort = 'rt', mParty = '', mDir = '', mText = '', mShown = PAGE;

async function openMedio(handle) {
  handle = '@' + handle.replace(/^@/, '');
  const meta = INDEX.medios.find(m => m.handle.toLowerCase() === handle.toLowerCase());
  if (!meta) { location.hash = '#/ranking'; return; }
  show('medio');
  $('#medio-panel').innerHTML = '<p class="empty">Cargando tuits…</p>';
  if (!MEDIO || MEDIO.handle !== meta.handle) {
    MEDIO = await (await fetch('data/' + meta.archivo)).json();
  }
  mSort = 'rt'; mParty = ''; mDir = ''; mText = ''; mShown = PAGE;
  pintarMedio(meta);
}
function pintarMedio(meta) {
  const claro = meta.izq + meta.der;
  const idx = meta.indice;
  const cls = idx < -0.05 ? 'n' : idx > 0.05 ? 'p' : '';
  const txt = (idx > 0 ? '+' : idx < 0 ? '−' : '') + Math.abs(idx).toFixed(2);
  $('#medio-panel').innerHTML = `
    <div class="medio-head">
      <div>
        <h2>${esc(meta.nombre)}</h2>
        <p class="sub">${esc(meta.handle)} · ${compact(meta.seguidores)} seguidores · ${meta.virales} tuits con más de 100 retuits</p>
      </div>
      <div><span class="idx-pill ${cls}" style="font-size:16px;padding:7px 14px">${txt}</span></div>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="k">Con lectura política</div><div class="v">${nf(meta.politicos)}</div></div>
      <div class="kpi"><div class="k">A la izquierda</div><div class="v" style="color:var(--izq)">${nf(meta.izq)}</div></div>
      <div class="kpi"><div class="k">A la derecha</div><div class="v" style="color:var(--der)">${nf(meta.der)}</div></div>
      <div class="kpi"><div class="k">Neutro</div><div class="v" style="color:var(--neu)">${nf(meta.neutro)}</div></div>
      <div class="kpi"><div class="k">RT mediana</div><div class="v">${nf(meta.rt_mediana)}</div></div>
      <div class="kpi"><div class="k">RT máxima</div><div class="v">${nf(meta.rt_max)}</div></div>
    </div>
    <div class="filters">
      <input type="search" id="mt" placeholder="Buscar en sus tuits…" autocomplete="off">
      <select id="mp"><option value="">Todo partido</option>${PARTIDOS.filter(p => meta.partidos[p]).map(p => `<option value="${p}">${p} (${nf(meta.partidos[p])})</option>`).join('')}</select>
      <select id="md"><option value="">Toda dirección</option>${['beneficia', 'perjudica', 'neutro'].filter(d => meta.direccion[d]).map(d => `<option value="${d}">${DIRTXT[d]} (${nf(meta.direccion[d])})</option>`).join('')}</select>
      <select id="ms">
        <option value="rt">Ordenar por retuits</option>
        <option value="lk">Ordenar por me gusta</option>
        <option value="vw">Ordenar por vistas</option>
        <option value="f">Ordenar por fecha</option>
      </select>
      <select id="mo"><option value="">Todos los tuits</option><option value="pol">Solo con partido</option></select>
    </div>
    <div id="mlist" class="cards-list"></div>
    <button class="more" id="mmore" hidden>Cargar más</button>`;
  $('#back').onclick = () => { location.hash = '#/ranking'; };
  $('#mt').addEventListener('input', e => { mText = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#mp').addEventListener('change', e => { mParty = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#md').addEventListener('change', e => { mDir = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#ms').addEventListener('change', e => { mSort = e.target.value; pintarListaMedio(); });
  $('#mo').addEventListener('change', e => { mShown = PAGE; pintarListaMedio(); });
  $('#mmore').addEventListener('click', () => { mShown += PAGE; pintarListaMedio(); });
  pintarListaMedio();
}
function filtrarTuits() {
  const q = mText.trim().toLowerCase();
  const soloPol = ($('#mo') || {}).value === 'pol';
  let ts = MEDIO.tweets.filter(t =>
    (!mParty || t.p === mParty) &&
    (!mDir || t.d === mDir) &&
    (!soloPol || t.p) &&
    (!q || t.t.toLowerCase().includes(q)));
  ts = ts.slice().sort((a, b) => mSort === 'f' ? (a.f < b.f ? 1 : -1) : (b[mSort] - a[mSort]));
  return ts;
}
function pintarListaMedio() {
  const ts = filtrarTuits();
  const total = ts.length;
  $('#mlist').innerHTML = total
    ? ts.slice(0, mShown).map(t => tarjeta(t, MEDIO.handle, MEDIO.nombre)).join('')
    : '<p class="empty">Ningún tuit coincide con esos filtros.</p>';
  const more = $('#mmore');
  more.hidden = total <= mShown;
  more.textContent = `Cargar más (${nf(total - mShown)} restantes)`;
}

/* ---------- tarjeta de tuit ---------- */
function tarjeta(t, handle, nombre) {
  const low = (t.pc && t.pc < 0.6) || (t.dc && t.dc < 0.6);
  const chips = [];
  if (t.p) chips.push(`<span class="chip ${CHIP[t.p] || 'otros'} ${low ? 'low' : ''}" title="confianza ${(t.pc * 100).toFixed(0)} %">${t.p}</span>`);
  if (t.d) chips.push(`<span class="chip ${DIRCHIP[t.d] || 'neu'} ${low ? 'low' : ''}" title="confianza ${(t.dc * 100).toFixed(0)} %">${DIRTXT[t.d]}</span>`);
  if (t.ir >= 0.6) chips.push('<span class="chip otros" title="ironía detectada">ironía</span>');
  return `<article class="tweet">
    <div class="head">
      <span class="who">${esc(nombre || handle)}</span>
      <span>${esc(handle)}</span>
      <span>${fecha(t.f)}</span>
      <span class="chips">${chips.join('')}</span>
    </div>
    <p>${esc(t.t)}</p>
    <div class="metrics">
      <span>🔁 <b>${nf(t.rt)}</b> retuits</span>
      <span>❤️ <b>${nf(t.lk)}</b> me gusta</span>
      <span>💬 <b>${nf(t.rp)}</b></span>
      <span>👁️ <b>${compact(t.vw)}</b></span>
      <span><a href="${esc(t.u)}" target="_blank" rel="noopener">Ver en X ↗</a></span>
    </div>
  </article>`;
}

/* ---------- top virales ---------- */
let TOP = null, topShown = PAGE, topParty = '', topDir = '';
async function cargarTop() {
  if (TOP) return;
  TOP = await (await fetch('data/top.json')).json();
  const cnt = {};
  TOP.forEach(t => { cnt[t.p] = (cnt[t.p] || 0) + 1; });
  $('#top-filtros').innerHTML = `
    <select id="tp"><option value="">Todo partido</option>${PARTIDOS.filter(p => cnt[p]).map(p => `<option value="${p}">${p} (${nf(cnt[p])})</option>`).join('')}</select>
    <select id="td"><option value="">Toda dirección</option><option value="beneficia">beneficia</option><option value="perjudica">perjudica</option><option value="neutro">neutro</option></select>`;
  $('#tp').addEventListener('change', e => { topParty = e.target.value; topShown = PAGE; pintarTop(); });
  $('#td').addEventListener('change', e => { topDir = e.target.value; topShown = PAGE; pintarTop(); });
  $('#top-more').addEventListener('click', () => { topShown += PAGE; pintarTop(); });
  pintarTop();
}
function pintarTop() {
  const ts = TOP.filter(t => (!topParty || t.p === topParty) && (!topDir || t.d === topDir));
  $('#top-list').innerHTML = ts.length ? ts.slice(0, topShown).map(t => tarjeta(t, t.h, t.h)).join('')
    : '<p class="empty">Nada que mostrar con esos filtros.</p>';
  const m = $('#top-more');
  m.hidden = ts.length <= topShown;
  m.textContent = `Cargar más (${nf(ts.length - topShown)} restantes)`;
}

/* ---------- arranque ---------- */
(async function init() {
  INDEX = await (await fetch('data/index.json')).json();
  pintarTotales();
  pintarStats();
  pintarRanking();
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h === 'top') { await cargarTop(); }
  route();
})();
window.addEventListener('hashchange', () => { if (location.hash.includes('top')) cargarTop(); });

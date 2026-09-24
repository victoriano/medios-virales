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

/* ---------- lecturas del reparto ----------
   claro  = tuits que señalan a un partido con lado (izq + der): el denominador de la web.
   politicos = todos los tuits con lectura política, incluidos los que informan sin lado. */
const CLARO_MIN = 15;             // por debajo de esto la muestra no da para leer décimos
const SIGNIFICADOS_MIN = 50;      // solo medios con izq + der > 50 en toda la muestra

// Décimos del lado dominante sobre los tuits con lado claro. El lado minoritario nunca baja a 0
// si existe, para no contradecir las columnas de recuento.
function decimos(m) {
  const claro = (m.izq || 0) + (m.der || 0);
  if (!claro) return { claro: 0, izqLado: true, nDom: 0, nMin: 0, lado: 'izq', texto: '' };
  const izqLado = (m.izq || 0) >= (m.der || 0);
  const min = Math.min(m.izq || 0, m.der || 0);
  const nMin = min === 0 ? 0 : Math.max(1, Math.min(9, Math.round(10 * min / claro)));
  const nDom = 10 - nMin;
  const lado = izqLado ? 'izq' : 'der';
  return { claro, izqLado, nDom, nMin, lado, texto: `${nDom} ${lado} · ${nMin} ${izqLado ? 'der' : 'izq'}` };
}
// Porcentajes sobre TODOS los tuits políticos. El "sin lado" cierra el 100 %: son los que
// informan sin tomar partido (incluye los que no señalan a un partido concreto).
function reparto(m) {
  const p = m.politicos || 0;
  const izq = p ? Math.round(100 * (m.izq || 0) / p) : 0;
  const der = p ? Math.round(100 * (m.der || 0) / p) : 0;
  return { izq, der, sin: Math.max(0, 100 - izq - der) };
}
let INDEX = null;
let POL = null;                   // data/polarizacion.json: lo publicado frente a lo viral
let VER = '';                     // sello de la build para cachear los datos del medio
const CACHE = new Map();          // url -> promesa, para no pedir dos veces lo mismo

/* ---------- carga de datos ---------- */
function pedirJSON(url) {
  if (!CACHE.has(url)) {
    const p = fetch(url).then(r => {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.json();
    });
    p.catch(() => CACHE.delete(url));   // si falla, que se pueda reintentar
    CACHE.set(url, p);
  }
  return CACHE.get(url);
}
const metaDe = h => INDEX.medios.find(m => m.handle.replace('@', '').toLowerCase() === String(h).replace('@', '').toLowerCase());
// adelanta la descarga del medio al pasar el raton por encima: al pulsar ya esta en memoria
function prefetchMedio(meta) {
  if (!meta || !meta.archivo) return;
  if (navigator.connection && navigator.connection.saveData) return;
  pedirJSON('data/' + meta.archivo + VER).catch(() => {});
}

/* ---------- navegación ---------- */
const VIEWS = ['ranking', 'mapa', 'medio', 'top', 'metodo'];
const PERIODOS_VALIDOS = ['todo', '2023', '2024', '2025', '2026'];
function show(v) {
  VIEWS.forEach(x => { $('#view-' + x).hidden = x !== v; });
  $$('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.view === v));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('.tab').forEach(t => t.addEventListener('click', () => {
  // al cambiar de vista mantenemos el periodo activo del mapa en la url compartible
  const base = '#/' + t.dataset.view;
  location.hash = t.dataset.view === 'mapa' ? base + hashPeriodo() : base;
}));
window.addEventListener('hashchange', route);
// serializa el periodo elegido en el hash: #/mapa?p=2025 (o nada si es el todo)
function hashPeriodo() {
  return mapaPeriodo && mapaPeriodo !== 'todo' ? '?p=' + mapaPeriodo : '';
}
// lee el periodo del hash o de la query para arrancar con la url del usuario
function leePeriodoDeUrl(cadena) {
  const partes = cadena.split('?');
  if (partes.length > 1) {
    const usp = new URLSearchParams(partes[1]);
    const p = usp.get('p');
    if (p && PERIODOS_VALIDOS.includes(p)) return p;
  }
  const q = new URLSearchParams(location.search);
  const qp = q.get('p');
  if (qp && PERIODOS_VALIDOS.includes(qp)) return qp;
  return null;
}
function route() {
  const bruto = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const ruta = bruto.split('?')[0];
  const desdeUrl = leePeriodoDeUrl(bruto);
  if (desdeUrl && desdeUrl !== mapaPeriodo) {
    mapaPeriodo = desdeUrl;
    const sel = $('#mapa-periodo');
    if (sel) sel.value = mapaPeriodo;
  }
  if (ruta.startsWith('medio/')) { openMedio(ruta.slice(6)); return; }
  if (ruta === 'ranking') { show('ranking'); pintarRanking(); return; }
  if (ruta === 'top') { show('top'); return; }
  if (ruta === 'metodo') { show('metodo'); return; }
  show('mapa'); renderMapa();   // el mapa es la vista por defecto
}

/* ---------- cabecera / método ---------- */
function pintarTotales() {
  const t = INDEX.totales;
  $('#n-virales').textContent = nf(t.muestreados || t.virales);
  $('#n-medios').textContent = t.medios;
  $('#m-gate').textContent = `${nf(t.gate_si)} claros, ${nf(t.gate_dudoso)} dudosos y ${nf(t.gate_no)} fuera`;
  $('#m-partido').textContent = PARTIDOS.filter(p => t.por_partido[p]).map(p => `${p} ${nf(t.por_partido[p])}`).join(' · ');
  $('#m-dir').textContent = Object.entries(t.por_direccion).map(([k, v]) => `${DIRTXT[k] || k} ${nf(v)}`).join(' · ');
  $('#m-fecha').textContent = INDEX.generado;
  $('#repo-link').href = REPO;
  const incluidos = INDEX.medios.filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN).length;
  $('#rank-note').textContent = `${incluidos} medios incluidos: cada uno se ha significado a favor o en contra más de 50 veces en toda la muestra. Periodo del ${INDEX.ventana.desde} al ${INDEX.ventana.hasta}.`;
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
      <p class="k">Tuits muestreados</p><p class="v">${nf(t.muestreados || t.virales)}</p>
      <p class="s">${nf(t.virales)} virales · ${t.medios} medios</p>
    </div>
    <div class="card">
      <p class="k">Con lectura política</p><p class="v">${nf(t.clasificados)}</p>
      <p class="s">${Math.round(100 * t.clasificados / (t.muestreados || t.virales))} % del total</p>
    </div>
    <div class="card">
      <p class="k">Partido más señalado</p><p class="v">PSOE</p>
      <p class="s">${nf(t.por_partido.PSOE)} tuits, ${Math.round(100 * t.por_partido.PSOE / totalP)} % de los políticos</p>
      <div class="bar">${dist.map(d => `<i style="width:${100 * d.v / totalP}%;background:${color[d.p]}"></i>`).join('')}</div>
      <div class="leyenda">${dist.map(d => `<span><i class="dot" style="background:${color[d.p]}"></i>${d.p} ${nf(d.v)}</span>`).join('')}</div>
    </div>
    <div class="card">
      <p class="k">Dirección</p><p class="v">${Math.round(100 * (t.por_direccion.perjudica || 0) / totalD)} % crítica</p>
      <p class="s">dirección de los tuits políticos</p>
      <div class="bar">${dir.map(d => `<i style="width:${100 * d.v / totalD}%;background:${cdir[d.d]}"></i>`).join('')}</div>
      <div class="leyenda">${dir.map(d => `<span><i class="dot" style="background:${cdir[d.d]}"></i>${DIRTXT[d.d]} ${nf(d.v)}</span>`).join('')}</div>
    </div>`;
}

/* ---------- ranking ---------- */
let sortKey = 'indice', sortDir = 1, query = '';

function pintarRanking() {
  const q = query.trim().toLowerCase();
  let rows = INDEX.medios
    .filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN)
    .map(m => ({ ...m, pct_politicos: m.muestreados ? 100 * m.politicos / m.muestreados : 0 }))
    .filter(m => !q || m.nombre.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q));
  rows = rows.slice().sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    if (typeof x === 'string') return sortDir * x.localeCompare(y);
    return sortDir * (x - y);
  });
  const tb = $('#tabla-ranking tbody');
  if (!rows.length) { tb.innerHTML = `<tr><td colspan="8" class="empty">Ningún medio coincide con esa búsqueda.</td></tr>`; return; }
  tb.innerHTML = rows.map(m => {
    const d = decimos(m), p = reparto(m);
    const tot = d.claro;
    const w = tot ? { i: 100 * m.izq / tot, d: 100 * m.der / tot } : { i: 0, d: 0 };
    const cls = m.indice < -0.05 ? 'n' : m.indice > 0.05 ? 'p' : '';
    const txt = (m.indice > 0 ? '+' : m.indice < 0 ? '−' : '') + Math.abs(m.indice).toFixed(2);
    const pocos = tot < CLARO_MIN;
    const marca = pocos ? ' <span class="star" title="menos de 15 tuits con lado claro: muestra insuficiente">*</span>' : '';
    return `<tr data-h="${esc(m.handle)}">
      <td><div class="medio-cell"><div><div><strong>${esc(m.nombre)}</strong></div><div class="h">${esc(m.handle)} · ${compact(m.seguidores)} seguidores</div></div></div></td>
      <td class="c-dec">
        <div class="dec">
          <div class="dec-top">${tot ? `<strong>${d.texto}</strong>` : '<span class="dec-sin">sin tuits con lado claro</span>'}</div>
          <div class="mini"><i style="width:${w.i}%;background:var(--izq)"></i><i style="width:${w.d}%;background:var(--der)"></i></div>
          <div class="dec-sub">${p.izq} % izq · ${p.der} % der · ${p.sin} % sin lado</div>
          <div class="dec-n">(${nf(tot)} con lado claro)${marca}</div>
        </div>
      </td>
      <td class="num"><span class="idx-pill idx-tech ${cls}" title="índice de sesgo: de −1 (todo a la izquierda) a +1 (todo a la derecha). Ordena la tabla por defecto">${txt}</span></td>
      <td class="num">${nf(m.virales)}</td>
      <td class="num">${nf(m.politicos)}</td>
      <td class="num c-izq">${nf(m.izq)}</td>
      <td class="num c-der">${nf(m.der)}</td>
      <td class="num c-pct">${m.pct_politicos.toFixed(1).replace('.', ',')} %</td>
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
// al pasar por encima de una fila se adelanta su descarga
$('#tabla-ranking tbody').addEventListener('mouseover', e => {
  const tr = e.target.closest('tr[data-h]');
  if (tr) prefetchMedio(metaDe(tr.dataset.h));
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
    try {
      MEDIO = await pedirJSON('data/' + meta.archivo + VER);
    } catch (err) {
      $('#medio-panel').innerHTML = '<p class="empty">No se han podido cargar sus tuits. Prueba otra vez.</p>';
      return;
    }
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
        <p class="sub">${esc(meta.handle)} · ${compact(meta.seguidores)} seguidores · ${nf(meta.muestreados || meta.virales)} tuits muestreados · ${nf(meta.virales)} virales</p>
      </div>
      <div><span class="idx-pill ${cls}" style="font-size:16px;padding:7px 14px">${txt}</span></div>
    </div>
    <div class="kpis" id="mkpis"></div>
    <p class="foot-note" id="mkpinota" hidden></p>
    <div class="filters">
      <input type="search" id="mt" placeholder="Buscar en sus tuits…" autocomplete="off">
      <select id="mp"></select>
      <select id="md"></select>
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
  pintarMedioCifras(ts);
  const total = ts.length;
  $('#mlist').innerHTML = total
    ? ts.slice(0, mShown).map(t => tarjeta(t, MEDIO.handle, MEDIO.nombre)).join('')
    : '<p class="empty">Ningún tuit coincide con esos filtros.</p>';
  const more = $('#mmore');
  more.hidden = total <= mShown;
  more.textContent = `Cargar más (${nf(total - mShown)} restantes)`;
}
/* Los indicadores y los recuentos de los desplegables se recalculan sobre lo que dejan los filtros.
   Cada desplegable cuenta con los DEMAS filtros aplicados, no consigo mismo. */
function pintarMedioCifras(ts) {
  const IZQ = { PSOE: 1, Sumar: 1 }, DER = { PP: 1, Vox: 1 };
  let izq = 0, der = 0, neu = 0, pol = 0;
  for (const t of ts) {
    if (!t.p) continue;
    pol++;
    if (t.d === 'beneficia' && IZQ[t.p]) izq++;
    else if (t.d === 'beneficia' && DER[t.p]) der++;
    else if (t.d === 'perjudica' && DER[t.p]) izq++;
    else if (t.d === 'perjudica' && IZQ[t.p]) der++;
    else neu++;
  }
  const rts = ts.map(t => t.rt).sort((a, b) => a - b);
  const med = rts.length ? rts[Math.floor(rts.length / 2)] : 0;
  const max = rts.length ? rts[rts.length - 1] : 0;
  $('#mkpis').innerHTML = `
      <div class="kpi"><div class="k">Con lectura política</div><div class="v">${nf(pol)}</div></div>
      <div class="kpi"><div class="k">A la izquierda</div><div class="v" style="color:var(--izq)">${nf(izq)}</div></div>
      <div class="kpi"><div class="k">A la derecha</div><div class="v" style="color:var(--der)">${nf(der)}</div></div>
      <div class="kpi"><div class="k">Neutro</div><div class="v" style="color:var(--neu)">${nf(neu)}</div></div>
      <div class="kpi"><div class="k">RT mediana</div><div class="v">${nf(med)}</div></div>
      <div class="kpi"><div class="k">RT máxima</div><div class="v">${nf(max)}</div></div>`;

  const filtrando = !!(mParty || mDir || mText.trim() || ($('#mo') || {}).value === 'pol');
  const nota = $('#mkpinota');
  nota.hidden = !filtrando;
  nota.textContent = filtrando
    ? `Cifras calculadas sobre los ${nf(ts.length)} ${ts.length === 1 ? 'tuit' : 'tuits'} que cumplen los filtros, no sobre el medio entero.`
    : '';

  // recuentos por faceta: cada uno con los demas filtros aplicados
  const q = mText.trim().toLowerCase();
  const soloPol = ($('#mo') || {}).value === 'pol';
  const base = MEDIO.tweets.filter(t => (!soloPol || t.p) && (!q || t.t.toLowerCase().includes(q)));
  const cPart = {}, cDir = {};
  for (const t of base) {
    if (t.p && (!mDir || t.d === mDir)) cPart[t.p] = (cPart[t.p] || 0) + 1;
    if (t.d && (!mParty || t.p === mParty)) cDir[t.d] = (cDir[t.d] || 0) + 1;
  }
  const mp = $('#mp'), md = $('#md');
  if (mp) {
    mp.innerHTML = '<option value="">Todo partido</option>' +
      PARTIDOS.filter(p => cPart[p] || p === mParty).map(p => `<option value="${p}">${p} (${nf(cPart[p] || 0)})</option>`).join('');
    mp.value = mParty;
  }
  if (md) {
    md.innerHTML = '<option value="">Toda dirección</option>' +
      ['beneficia', 'perjudica', 'neutro'].filter(d => cDir[d] || d === mDir).map(d => `<option value="${d}">${DIRTXT[d]} (${nf(cDir[d] || 0)})</option>`).join('');
    md.value = mDir;
  }
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
  TOP = await pedirJSON('data/top.json' + VER);
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

/* ---------- mapa de dispersión ----------
   Eje horizontal: la posición del medio en la escala izquierda → derecha. El cero cae en el
   borde izquierdo del mapa (todo a la izquierda) y el cien en el derecho (todo a la derecha),
   porque posicion = 100 * derecha / (izquierda + derecha) — es el mismo campo que trae
   data/polarizacion.json.
   Colores: ROJO para los medios de izquierda, AZUL para los de derecha y gris para el centro.
   El control de series deja ver solo lo publicado, solo lo viral o las dos posiciones. En el
   modo de las dos, la flecha va del punto publicado al punto viral: hacia dónde se desplaza el
   medio cuando su contenido se comparte. */
const MAPA_COLOR = { izq: 'var(--map-izq)', der: 'var(--map-der)', neu: 'var(--map-neu)' };
const ladoDe = p => p < 45 ? 'izq' : p > 55 ? 'der' : 'neu';
const colorDe = p => MAPA_COLOR[ladoDe(p)];

let mapaSerie = 'ambas';    // publicado | viral | ambas
let mapaFiltro = 5;         // mínimo de tuits con lado claro en cada serie dibujada
let mapaPeriodo = 'todo';   // ventana temporal: todo | 2023 | 2024 | 2025 | 2026

// devuelve el array de medios del periodo activo con fallback al periodo completo
function mediosPeriodo() {
  if (!POL) return [];
  const bloque = POL.periodos && POL.periodos[mapaPeriodo];
  if (bloque && Array.isArray(bloque.medios)) return bloque.medios;
  return POL.medios || [];   // fallback exigido: si falta el periodo, usa el completo
}
// para el tooltip: busca el registro del medio en el periodo actual
function polDe(handle) {
  return mediosPeriodo().find(r => r.handle.toLowerCase() === (handle || '').toLowerCase());
}
const PERIODO_TXT = { todo: 'toda la XV Legislatura', 2023: '2023', 2024: '2024', 2025: '2025', 2026: '2026' };
const RADIO = v => Math.max(9, 0.85 * Math.sqrt(Math.max(v, 120)));
const RADIO_VIRAL = 0.84;   // el punto de lo viral se dibuja algo menor para no tapar el de lo publicado
const YTICKS = [0, 250, 500, 1000, 2000, 4000];
const volumen = d => d.politicos != null ? `${nf(d.politicos)} tuits políticos` : `${nf(d.juicios)} tuits con lectura`;
const puntos = n => n.toFixed(1).replace('.', ',');
const nombreSerie = s => s === 'publicado' ? 'publicado' : 'viral';

// filas del mapa: cada nodo lleva su medio, su serie, su posición (0-100 hacia la derecha) y su volumen
function filasMapa() {
  const metas = new Map(INDEX.medios.map(m => [m.handle.toLowerCase(), m]));
  const nodos = [], parejas = [];
  for (const r of mediosPeriodo()) {
    const m = metas.get(r.handle.toLowerCase());
    if (!m) continue;                                   // medios del censo sin muestra en polarizacion.json
    if ((m.izq || 0) + (m.der || 0) <= SIGNIFICADOS_MIN) continue;
    const pub = r.publicado, vir = r.viral;
    const okPub = !!pub && pub.posicion != null && pub.con_lado >= mapaFiltro;
    const okVir = !!vir && vir.posicion != null && vir.con_lado >= mapaFiltro;
    const nodoPub = { m, serie: 'publicado', p: pub ? pub.posicion : 0, y: pub ? (pub.politicos || 0) : 0, d: pub, o: vir };
    const nodoVir = { m, serie: 'viral', p: vir ? vir.posicion : 0, y: vir ? (vir.juicios || 0) : 0, d: vir, o: pub };
    if (mapaSerie === 'ambas') {
      // las dos posiciones solo se dibujan para quien tiene muestra en las dos series: si no, la
      // flecha saldria de un punto sin datos y mentiria sobre el desplazamiento
      if (!okPub || !okVir) continue;
      nodos.push(nodoPub, nodoVir);
      parejas.push({ m, p1: pub.posicion, y1: pub.politicos || 0, p2: vir.posicion, y2: vir.juicios || 0, pub, vir });
    } else if (mapaSerie === 'publicado' ? okPub : okVir) {
      nodos.push(mapaSerie === 'publicado' ? nodoPub : nodoVir);
    }
  }
  return { nodos, parejas };
}

function renderMapa() {
  const svg = $('#mapa');
  if (!INDEX) return;
  if (!POL) {
    svg.innerHTML = '';
    $('#mapa-resumen').textContent = '';
    $('#mapa-pie').innerHTML = '<div class="blq">No se han podido cargar los datos de lo publicado frente a lo viral.</div>';
    return;
  }
  const { nodos, parejas } = filasMapa();
  const totalUniverso = mediosPeriodo().length;
  const admitidos = new Set(INDEX.medios
    .filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN)
    .map(m => m.handle.toLowerCase()));
  const total = mediosPeriodo().filter(r => admitidos.has(r.handle.toLowerCase())).length;
  const dibujados = new Set(nodos.map(n => n.m.handle)).size;
  const fuera = total - dibujados;
  const fueraCorte = totalUniverso - total;
  const sinDatos = total === 0;
  const conFallback = !!POL.periodos && !(POL.periodos[mapaPeriodo] && Array.isArray(POL.periodos[mapaPeriodo].medios));

  const W = 1000, H = 620, M = { t: 46, r: 54, b: 66, l: 82 };
  const maxY = Math.max(1, ...nodos.map(n => n.y));
  const top = YTICKS.find(t => t >= maxY) || YTICKS[YTICKS.length - 1];
  const lista = YTICKS.filter(t => t <= top);
  const yMax = Math.sqrt(top);
  const px = v => M.l + v / 100 * (W - M.l - M.r);   // 0 = todo a la izquierda · 100 = todo a la derecha
  // PAD reserva aire arriba para que la burbuja mas alta no invada las etiquetas de zona
  const PAD = 32;
  const py = v => H - M.b - Math.sqrt(Math.max(v, 0)) / yMax * (H - M.t - M.b - PAD);
  const mitad = px(50);

  // bandas de fondo suaves, detrás de las burbujas: de la izquierda a la derecha
  const ZONAS = [
    [0, 20, 'muy a la izquierda', 'z-miz'],
    [20, 40, 'a la izquierda', 'z-iz'],
    [40, 60, 'equilibrio', 'z-eq'],
    [60, 80, 'a la derecha', 'z-dr'],
    [80, 100, 'muy a la derecha', 'z-mdr'],
  ];
  let g = '', etiquetas = '';
  ZONAS.forEach(([a, z, txt, cls]) => {
    const x = px(a), w = px(z) - x;
    g += `<rect class="zona ${cls}" x="${x.toFixed(1)}" y="${M.t}" width="${w.toFixed(1)}" height="${H - M.b - M.t}"></rect>`;
    etiquetas += `<text x="${(x + w / 2).toFixed(1)}" y="${M.t - 8}">${txt}</text>`;
  });
  lista.forEach(t => {
    g += `<line x1="${M.l}" x2="${W - M.r}" y1="${py(t).toFixed(1)}" y2="${py(t).toFixed(1)}"></line>`;
    g += `<text x="${M.l - 11}" y="${(py(t) + 4).toFixed(1)}" text-anchor="end">${nf(t)}</text>`;
  });
  const EJEX = [[0, '0'], [20, '2 de cada 10'], [40, '4 de cada 10'], [50, 'mitad y mitad'],
                [60, '6 de cada 10'], [80, '8 de cada 10'], [100, '10 de cada 10']];
  EJEX.forEach(([v, txt]) => {
    const x = px(v).toFixed(1), c = v === 50 ? 'mitad' : '';
    g += `<line class="${c}" x1="${x}" x2="${x}" y1="${M.t}" y2="${H - M.b}"></line>`;
    g += `<text class="${c}" x="${x}" y="${H - M.b + 21}" text-anchor="middle">${txt}</text>`;
  });
  const tituloPeriodo = mapaPeriodo === 'todo' ? 'toda la XV Legislatura' : mapaPeriodo;
  const tituloY = mapaSerie === 'publicado' ? `Tuits políticos · hasta 100 Latest por medio y mes de ${tituloPeriodo}`
    : mapaSerie === 'viral' ? `Tuits virales con lectura · subconjunto con más de 100 retuits de ${tituloPeriodo}`
      : `Tuits con lectura · lo publicado frente a lo viral · ${tituloPeriodo}`;
  g += `<text class="tit" x="${M.l}" y="18">${tituloY}</text>`;
  g += `<text class="tit" x="${M.l}" y="${H - M.b + 46}">◀ todo a la izquierda</text>`;
  g += `<text class="tit" x="${mitad.toFixed(1)}" y="${H - M.b + 46}" text-anchor="middle">% de los tuits con lado que va a la derecha</text>`;
  g += `<text class="tit" x="${W - M.r}" y="${H - M.b + 46}" text-anchor="end">todo a la derecha ▶</text>`;

  // las flechas van antes que las burbujas para quedar por debajo: apuntan de lo publicado a lo viral
  const flechas = parejas.map(f => {
    const x1 = px(f.p1), y1 = py(f.y1), x2 = px(f.p2), y2 = py(f.y2);
    const r1 = RADIO(f.m.rt_media), r2 = RADIO(f.m.rt_media) * RADIO_VIRAL;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    if (L < r1 + r2 + 30) return '';          // sin sitio para una flecha legible
    const ux = dx / L, uy = dy / L;
    const sx = x1 + ux * (r1 + 3), sy = y1 + uy * (r1 + 3);
    const ex = x2 - ux * (r2 + 4), ey = y2 - uy * (r2 + 4);
    const hl = 11, hw = 5.4;                  // largo y ancho de la punta
    const bx = ex - ux * hl, by = ey - uy * hl, nx = -uy, ny = ux;
    const c = colorDe(f.p1), delta = f.p2 - f.p1;
    return `<g class="flecha lado-${ladoDe(f.p1)}" data-h="${esc(f.m.handle)}" data-delta="${delta.toFixed(1)}"
        data-publicado="${f.p1.toFixed(1)}" data-viral="${f.p2.toFixed(1)}"
        data-x1="${x1.toFixed(1)}" data-y1="${y1.toFixed(1)}" data-x2="${x2.toFixed(1)}" data-y2="${y2.toFixed(1)}">
      <path class="rastro" d="M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}" stroke="${c}"></path>
      <polygon class="punta" fill="${c}" points="${ex.toFixed(1)},${ey.toFixed(1)} ${(bx + nx * hw).toFixed(1)},${(by + ny * hw).toFixed(1)} ${(bx - nx * hw).toFixed(1)},${(by - ny * hw).toFixed(1)}"></polygon>
    </g>`;
  }).join('');

  const orden = nodos.slice().sort((a, b) => RADIO(b.m.rt_media) - RADIO(a.m.rt_media));
  const burbujas = orden.map((n, i) => {
    const r = RADIO(n.m.rt_media) * (n.serie === 'viral' ? RADIO_VIRAL : 1);
    const cx = px(n.p), cy = py(n.y);
    const d = (r * 1.74).toFixed(1), off = (-r * 0.87).toFixed(1);
    return `<g class="burbuja burbuja-${n.serie} lado-${ladoDe(n.p)}" data-h="${esc(n.m.handle)}"
        data-serie="${n.serie}" data-posicion="${n.p.toFixed(1)}" data-i="${i}" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})">
      <circle class="aro${n.serie === 'viral' ? ' dis' : ''}" r="${r.toFixed(1)}" stroke="${colorDe(n.p)}"></circle>
      <image href="${esc(n.m.logo)}" x="${off}" y="${off}" width="${d}" height="${d}"></image>
    </g>`;
  }).join('');

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<g class="grid">${g}</g><g class="flechas">${flechas}</g><g class="nodos">${burbujas}</g><g class="etiquetas">${etiquetas}</g>`;

  // resumen de lo que se está viendo, calculado sobre los datos dibujados
  const res = [];
  if (mapaSerie === 'ambas') {
    const deltas = parejas.map(f => f.p2 - f.p1).sort((a, b) => a - b);
    const med = deltas.length ? deltas[Math.floor(deltas.length / 2)] : 0;
    const suLado = parejas.filter(f => f.p1 < 50 ? f.p2 < f.p1 : f.p1 > 50 ? f.p2 > f.p1 : false).length;
    res.push(`${nf(parejas.length)} medios con muestra en las dos series.`);
    if (parejas.length) res.push(`${suLado} de ${parejas.length} se ${suLado === 1 ? 'desplaza' : 'desplazan'} hacia su propio lado al compartirse.`);
    res.push(med === 0 ? 'La mediana del desplazamiento es de cero puntos.'
      : `La mediana del desplazamiento es de ${puntos(Math.abs(med))} puntos hacia la ${med < 0 ? 'izquierda' : 'derecha'}.`);
  } else {
    res.push(`${nf(dibujados)} medios dibujados con la muestra de lo ${nombreSerie(mapaSerie)}.`);
  }
  $('#mapa-resumen').textContent = res.join(' ');

  svg.querySelectorAll('.burbuja').forEach(el => {
    const n = orden[Number(el.dataset.i)];
    if (!n) return;
    const m = n.m;
    el.addEventListener('mouseenter', e => {
      // solo se reordena si hace falta: si no, el propio reorden cambia el DOM bajo el
      // cursor, vuelve a disparar mouseenter y entra en un bucle infinito de repintado
      if (el !== el.parentNode.lastElementChild) el.parentNode.appendChild(el);
      prefetchMedio(m);
      tipMapa(n, e);
    });
    el.addEventListener('mousemove', e => tipMapa(n, e));
    el.addEventListener('mouseleave', () => { $('#mapa-tip').hidden = true; });
    el.addEventListener('touchstart', () => prefetchMedio(m), { passive: true });
    el.addEventListener('pointerdown', () => prefetchMedio(m));
    el.addEventListener('click', () => { location.hash = '#/medio/' + m.handle.replace('@', ''); });
  });

  const bola = v => `<span class="bola" style="width:${(2 * RADIO(v)).toFixed(0)}px;height:${(2 * RADIO(v)).toFixed(0)}px"></span> ${nf(v)} RT`;
  const notaFiltro = mapaFiltro
    ? `Solo se dibujan los medios con ${nf(mapaFiltro)} o más tuits con lado claro en cada serie.`
    : 'Se dibujan todos los medios con muestra en la serie elegida.';
  $('#mapa-pie').innerHTML = `
    <div class="blq"><strong>Tamaño</strong> ${bola(200)} ${bola(500)} ${bola(1000)}</div>
    <div class="blq"><strong>Aro</strong> <span class="aro" style="border-color:var(--map-izq)"></span> izquierda
      <span class="aro" style="border-color:var(--map-der);margin-left:10px"></span> derecha
      <span class="aro" style="border-color:var(--map-neu);margin-left:10px"></span> centro</div>
    ${mapaSerie === 'ambas' ? `<div class="blq"><strong>Aro continuo</strong> lo publicado · <strong>aro discontinuo</strong> lo viral</div>
      <div class="blq"><strong>Flecha</strong> de la posición publicada a la viral: hacia dónde se desplaza el medio al compartirse</div>` : ''}
    <div class="blq">El eje vertical usa raíz cuadrada para que los medios pequeños no queden aplastados.</div>
    <div class="blq"><strong>Corte de inclusión</strong> más de 50 tuits significados a favor o en contra en toda la muestra.</div>
    <div class="blq">${notaFiltro}</div>
    ${fueraCorte ? `<div class="blq">${fueraCorte} ${fueraCorte === 1 ? 'medio queda fuera' : 'medios quedan fuera'} por no superar el corte de inclusión.</div>` : ''}
    ${fuera ? `<div class="blq">${fuera} ${fuera === 1 ? 'medio incluido queda fuera' : 'medios incluidos quedan fuera'} con este filtro de visualización.</div>` : ''}`;
}

function tipMapa(n, ev) {
  const tip = $('#mapa-tip'), wrap = $('.chart-wrap');
  const m = n.m;
  const pub = n.serie === 'publicado' ? n.d : n.o;
  const vir = n.serie === 'viral' ? n.d : n.o;
  const linea = (d, etq) => d && d.posicion != null
    ? `<div class="tv"><b>${etq}</b>: ${puntos(d.posicion)} % a la derecha${d.con_lado < 15 ? ' (muestra corta)' : ''} · ${nf(d.con_lado)} con lado claro de ${volumen(d)}</div>`
    : '';
  let desplaz = '';
  if (pub && vir && pub.posicion != null && vir.posicion != null && vir.con_lado >= 5) {
    const delta = vir.posicion - pub.posicion;
    desplaz = Math.abs(delta) < 0.05
      ? '<div class="tv frase">Al compartirse se queda en el mismo sitio.</div>'
      : `<div class="tv frase">Al compartirse se desplaza ${puntos(Math.abs(delta))} puntos hacia la ${delta < 0 ? 'izquierda' : 'derecha'}.</div>`;
  }
  const d = decimos(m), p = reparto(m);
  const frase = !d.claro ? `sin tuits con lado claro (${nf(m.politicos)} tuits políticos)`
    : `${d.texto} (${nf(d.claro)} claros de ${nf(m.politicos)} tuits políticos; ${p.sin} % sin lado)`;
  tip.innerHTML = `<div class="tt">${esc(m.nombre)}</div>
    <div class="tv frase">${esc(frase)}</div>
    ${linea(pub, 'Publicado')}${linea(vir, 'Viral')}${desplaz}
    <div class="tv tm">${esc(m.handle)} · ${nf(m.rt_media)} retuits de media · índice de la muestra completa ${m.indice > 0 ? '+' : m.indice < 0 ? '−' : ''}${Math.abs(m.indice).toFixed(2)}</div>`;
  tip.hidden = false;
  const r = wrap.getBoundingClientRect();
  let x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 14;
  if (x + tip.offsetWidth > r.width - 4) x = ev.clientX - r.left - tip.offsetWidth - 16;
  if (y + tip.offsetHeight > r.height - 4) y = Math.max(4, r.height - tip.offsetHeight - 4);
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

/* ---------- arranque ---------- */
(async function init() {
  INDEX = await pedirJSON('data/index.json');
  VER = INDEX.ver ? '?v=' + INDEX.ver : '';
  pintarTotales();
  pintarStats();
  pintarRanking();
  try {
    POL = await pedirJSON('data/polarizacion.json' + VER);
  } catch (err) {
    POL = null;                      // el mapa avisa en su pie si falta el fichero
  }
  $('#mapa-serie').addEventListener('change', e => { mapaSerie = e.target.value; renderMapa(); });
  $('#mapa-filtro').value = String(mapaFiltro);
  $('#mapa-filtro').addEventListener('change', e => { mapaFiltro = Number(e.target.value) || 0; renderMapa(); });
  // al cambiar el periodo: guarda el estado, refresca el hash compartible, mantiene el modo
  // de serie activo y redibuja el mapa con la muestra recortada de ese año.
  const selPer = $('#mapa-periodo');
  if (selPer) {
    selPer.value = mapaPeriodo;
    selPer.addEventListener('change', e => {
      const v = e.target.value;
      mapaPeriodo = PERIODOS_VALIDOS.includes(v) ? v : 'todo';
      const nuevoHash = '#/mapa' + hashPeriodo();
      if (location.hash !== nuevoHash) {
        history.replaceState(null, '', nuevoHash);   // sin disparar hashchange para no reentrar
      }
      renderMapa();
    });
  }
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h === 'top') { await cargarTop(); }
  route();
})();
window.addEventListener('hashchange', () => { if (location.hash.includes('top')) cargarTop(); });

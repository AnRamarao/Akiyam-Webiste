/*
  Aikyam Website — Frontend Script
  - Vanilla JS for interactivity and data-driven rendering.
  - Data is fetched from ./data/*.json at runtime (static hosting friendly).
  - Keep behavior side-effect free on load; orchestrate via init().
*/

/* ===================== THEME TOGGLE (persisted) ==================== */
const themeToggle = document.getElementById('themeToggle');
(function initTheme() {
  const saved = localStorage.getItem('aikyam_theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light');
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('aikyam_theme', document.body.classList.contains('light') ? 'light' : 'dark');
  });
})();

/* ================== MOBILE NAV TOGGLE ==================
  Handles opening/closing the responsive nav. Ensures:
  - Toggle via button
  - Close on link tap / outside click
  - Close on resize above mobile breakpoint
*/
(function () {
  const header = document.getElementById('siteHeader');
  const btn = document.getElementById('navToggle');
  if (!btn || !header) return;
  const links = header.querySelector('.nav-links');
  const closeMenu = () => { header.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  const toggleMenu = () => {
    const open = header.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  btn.addEventListener('click', toggleMenu);

  // Close when a nav link is tapped (mobile UX)
  if (links) {
    links.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeMenu();
    });
  }

  // Close when clicking outside the header/nav area
  document.addEventListener('click', (e) => {
    if (!header.classList.contains('open')) return;
    if (!header.contains(e.target)) closeMenu();
  });

  // Close if resized above mobile breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  });
})();

/* ================== SCROLL PROGRESS & BACK-TO-TOP ==================
  Displays a top progress bar and a floating "back to top" button.
*/
(function () {
  const btn = document.getElementById('toTop');
  const prog = document.getElementById('scroll-progress');
  function onScroll() {
    const y = window.scrollY; const h = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.max(0, Math.min(1, y / h)); prog.style.width = (pct * 100) + '%';
    if (y > 280) btn.classList.add('show'); else btn.classList.remove('show');
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ====================== BUTTON RIPPLE EFFECT =======================
  Small UI touch on .btn elements.
*/
document.addEventListener('click', (e) => {
  const b = e.target.closest('.btn');
  if (!b) return;
  const r = document.createElement('span'); r.className = 'r';
  const rect = b.getBoundingClientRect(); r.style.left = (e.clientX - rect.left) + 'px'; r.style.top = (e.clientY - rect.top) + 'px';
  b.appendChild(r); setTimeout(() => r.remove(), 620);
});

/* =================== BACKGROUND ZOOM ON SCROLL =====================
  Parallax-like zoom of the hero background image on scroll.
*/
(function () {
  const img = document.getElementById('bgZoomImg');
  function onScroll() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const p = window.scrollY / max;
    const scale = 1 + p * 0.8;
    img.style.transform = `scale(${scale})`;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ======================= REVEAL ON INTERSECT =======================
  Adds .show to .reveal elements when they enter the viewport.
*/
(function () {
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); }) }, { threshold: .22 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

/* ========================= DATA & HELPERS ============================ */
// Data lists: will be populated from ./data/*.json at runtime
let upcomingEvents = [];
let completedEvents = [];

/** Create an <img> element with a fallback and perf-friendly hints. */
function makeImage(src, fallback, alt) {
  const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop';
  const im = document.createElement('img');
  im.src = src; im.alt = alt || '';
  im.loading = 'lazy';
  im.decoding = 'async';
  const fb = fallback || DEFAULT_FALLBACK;
  im.addEventListener('error', () => { if (im.src !== fb) im.src = fb; }, { once: true });
  return im;
}

/**
 * Build a vertical scrolling loop from items using a card renderer.
 * @param {string} hostId - container element id
 * @param {Array} items - list of data items
 * @param {(item:any, index:number)=>HTMLElement} renderCard - card factory
 */
function buildVLoop(hostId, items, renderCard) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = '';
  const track = document.createElement('div'); track.className = 'vtrack';
  const dup = document.createElement('div'); dup.className = 'vtrack';
  items.forEach((it, i) => track.appendChild(renderCard(it, i)));
  items.forEach((it, i) => dup.appendChild(renderCard(it, i + items.length)));
  const wrap = document.createElement('div'); wrap.style.display = 'grid'; wrap.style.gap = '16px';
  wrap.appendChild(track); wrap.appendChild(dup);
  host.appendChild(wrap);
}

/** Render a completed event card. */
function renderPastCard(ev) {
  const card = document.createElement('div'); card.className = 'event-card';
  const th = document.createElement('div'); th.className = 'event-thumb';
  th.appendChild(makeImage(ev.img, ev.fallback, ev.title));
  const body = document.createElement('div'); body.className = 'event-body';
  body.innerHTML = `
      <div class="event-title">${ev.title}</div>
      <div class="event-meta"><span class="pill">Completed</span><span>${new Date(ev.date).toLocaleDateString()}</span></div>
      <div class="event-desc">${ev.summary}</div>`;
  card.appendChild(th); card.appendChild(body);
  return card;
}
/**
 * Create a data: URI representing a single VEVENT ICS file.
 * @returns {string} data URI for download
 */
function makeICSDataURI(ev) {
  const dt = (s) => new Date(s).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = ev.id + '@aikyam';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aikyam//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${dt(new Date())}`, `DTSTART:${dt(ev.start)}`, `DTEND:${dt(ev.end)}`,
    `SUMMARY:${ev.title}`, `LOCATION:${ev.location}`, `DESCRIPTION:${ev.desc}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}

/** Render an upcoming/tbd event card with actions. */
function renderUpcomingCard(ev) {
  const card = document.createElement('div'); card.className = 'event-card';
  const th = document.createElement('div'); th.className = 'event-thumb';
  th.appendChild(makeImage(ev.img, ev.fallback, ev.title));
  const when = ev.tbd ? 'Date TBD' : new Date(ev.start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const body = document.createElement('div'); body.className = 'event-body';
  body.innerHTML = `
      <div class="event-title">${ev.title}</div>
      <div class="event-meta"><span class="pill">${ev.tbd ? 'TBD' : 'Upcoming'}</span><span>${ev.tbd ? 'To be announced' : when}</span></div>
      <div class="event-desc">${ev.location} • ${ev.price > 0 ? '$' + ev.price : 'Free'}</div>
      <div class="event-actions">
        ${ev.tbd ? '' : `<a class="btn mini secondary" href="${makeICSDataURI(ev)}" download="${ev.id}.ics">Add to Calendar</a>
        <a class="btn mini" href="#register">Register</a>`}
      </div>`;
  card.appendChild(th); card.appendChild(body);
  return card;
}
/**
 * Small utility: fetch JSON with a safe fallback when network or file isn't available.
 * @template T
 * @param {string} url
 * @param {T} fallback
 * @returns {Promise<T>}
 */
async function fetchJSONWithFallback(url, fallback = []) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) {
      return fallback;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    return fallback;
  }
}

// core team: load from data/coreTeam.json in the browser (fallback if fetch fails)
let coreTeam = [];
let coreLoaded = false;
/** Load core team list into memory (sets coreLoaded). */
async function loadCoreTeam() {
  coreTeam = await fetchJSONWithFallback('./data/coreTeam.json', []);
  coreLoaded = Array.isArray(coreTeam) && coreTeam.length > 0;
}

/** Render core team cards. */
function renderCore() {
  const host = document.getElementById('coreCards');
  if (!host) return;
  if (!coreLoaded) { host.innerHTML = '<div class="hint">Loading core team…</div>'; return; }
  host.innerHTML = '';
  coreTeam.forEach(m => {
    const card = document.createElement('div'); card.className = 'person-card';
    const img = makeImage(m.img, m.fallback, m.name); img.width = 180; img.height = 180;
    const name = document.createElement('div'); name.className = 'name'; name.textContent = m.name;
    const role = document.createElement('div'); role.className = 'role'; role.textContent = m.role;
    const locWrap = document.createElement('div'); locWrap.style.cssText = 'margin-top:10px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap';
    const loc = document.createElement('span'); loc.className = 'chip-mini'; loc.textContent = 'Menifee, CA';
    locWrap.appendChild(loc);
    card.appendChild(img); card.appendChild(name); card.appendChild(role); card.appendChild(locWrap);
    host.appendChild(card);
  });
}

let boardMembers = [];
let vendors = [];

/** Load events, vendors, and board members from JSON. */
async function loadUpcomingEvents() {
  upcomingEvents = await fetchJSONWithFallback('./data/upcomingEvents.json', []);
}
async function loadCompletedEvents() {
  completedEvents = await fetchJSONWithFallback('./data/completedEvents.json', []);
}
async function loadVendors() {
  vendors = await fetchJSONWithFallback('./data/vendors.json', []);
}
async function loadBoardMembers() {
  boardMembers = await fetchJSONWithFallback('./data/boardMembers.json', []);
}

/** Render board member cards. */
function renderBoard() {
  const host = document.getElementById('boardCards');
  if (!host) return;
  if (!Array.isArray(boardMembers) || boardMembers.length === 0) { host.innerHTML = '<div class="hint">Board will be announced soon.</div>'; return; }
  host.innerHTML = '';
  boardMembers.forEach(m => {
    const card = document.createElement('div'); card.className = 'person-card';
    const img = makeImage(m.img, m.fallback, m.name); img.width = 180; img.height = 180;
    const name = document.createElement('div'); name.className = 'name'; name.textContent = m.name;
    const role = document.createElement('div'); role.className = 'role'; role.textContent = m.role;
    card.appendChild(img); card.appendChild(name); card.appendChild(role);
    host.appendChild(card);
  });
}

/** Date-only equality check. */
function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
/** Map yyyy-m-d -> count of events on that date for the calendar indicator. */
function eventDateMap() {
  const m = {};
  upcomingEvents.forEach(ev => {
    if (!ev.tbd && ev.start) {
      const d = new Date(ev.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      m[key] = (m[key] || 0) + 1;
    }
  });
  return m;
}
/** Render the mini calendar and the schedule list for upcoming events. */
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthLbl = document.getElementById('calendarMonth');
  if (!grid || !monthLbl) return;
  const now = new Date();
  const focus = new Date(now.getFullYear(), now.getMonth(), 1);
  monthLbl.textContent = focus.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const startDow = (focus.getDay() + 7) % 7;
  const daysInMonth = new Date(focus.getFullYear(), focus.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const map = eventDateMap();

  grid.innerHTML = '';
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div'); cell.className = 'cal-cell';
    const dayNum = i - startDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    if (!inMonth) { cell.classList.add('mute'); cell.textContent = ''; }
    else {
      cell.textContent = dayNum;
      const d = new Date(focus.getFullYear(), focus.getMonth(), dayNum);
      if (map[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`]) cell.classList.add('has');
      if (sameDate(d, now)) cell.style.outline = '2px solid rgba(255,204,0,.7)';
    }
    grid.appendChild(cell);
  }

  const sched = document.getElementById('upcomingSchedule');
  const soon = upcomingEvents.slice().sort((a, b) => {
    const A = a.tbd ? Infinity : new Date(a.start).getTime();
    const B = b.tbd ? Infinity : new Date(b.start).getTime();
    return A - B;
  });
  sched.innerHTML = '';
  soon.forEach(ev => {
    const d = ev.tbd ? null : new Date(ev.start);
    const dt = ev.tbd ? 'Date TBD' : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const icsHref = !ev.tbd ? makeICSDataURI(ev) : '#';
    const item = document.createElement('div'); item.className = 'sch-item';
    item.innerHTML = `
        <div class="t">${ev.title}</div>
        <div class="d">${dt} — ${ev.location} • ${ev.price > 0 ? '$' + ev.price : 'Free'}</div>
        <div class="a">
          ${ev.tbd ? '' : `<a class="btn mini secondary" href="${icsHref}" download="${ev.id}.ics">Add to Calendar</a>
          <a class="btn mini" href="#register">Register</a>`}
        </div>`;
    sched.appendChild(item);
  });
}

/** Small toast helper (non-blocking, auto-hides). */
function toast(msg, ms = 1400) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove('show'), ms);
}

/* =================== GALLERY MARQUEE ===================
  Auto-scrolling gallery strip used for the Moments and vendor logos.
*/
(function () {
  const images = [
    { src: 'assets/gallery/Gallery1.jpg', label: 'Moment 1', fallback: 'https://images.unsplash.com/photo-1548020356-5a6d8924b7f8?q=80&w=1200&auto=format&fit=crop' },
    { src: 'assets/gallery/Gallery2.jpg', label: 'Moment 2', fallback: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop' },
    { src: 'assets/gallery/Gallery3.jpg', label: 'Moment 3', fallback: 'https://images.unsplash.com/photo-1520975922284-5fbc8da7e2f3?q=80&w=1200&auto=format&fit=crop' },
    { src: 'assets/gallery/Gallery4.jpg', label: 'Moment 4', fallback: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1200&auto=format&fit=crop' },
  ];
  const track = document.getElementById('gtrack');
  if (!track) return;
  function makeSlide(it) {
    const s = document.createElement('div'); s.className = 'gslide';
    const im = document.createElement('img'); im.src = it.src; im.alt = it.label; im.loading = 'lazy'; im.decoding = 'async';
    im.onerror = () => { if (it.fallback && im.src !== it.fallback) im.src = it.fallback; };
    im.width = 440; im.height = 268;
    const lb = document.createElement('div'); lb.className = 'label'; lb.textContent = it.label;
    s.appendChild(im); s.appendChild(lb); return s;
  }
  [...images, ...images].forEach(it => track.appendChild(makeSlide(it)));
  let x = 0; const speed = 0.35;
  function loop() {
    x -= speed;
    const halfWidth = track.scrollWidth / 2;
    if (Math.abs(x) >= halfWidth) { x = 0; }
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/** Render calendar and both past/upcoming vertical loops. */
function renderCalendarAndEvents() {
  renderCalendar();
  buildVLoop('pastVLoop', completedEvents, renderPastCard);
  buildVLoop('upVLoop', upcomingEvents, renderUpcomingCard);
}
/** Live countdown to the next upcoming event. */
function startCountdown() {
  const target = upcomingEvents.filter(e => !e.tbd && e.start && new Date(e.start).getTime() > Date.now())
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  const titleEl = document.getElementById('nextEventTitle');
  const c = document.getElementById('countdown');
  if (!titleEl || !c) return;
  if (!target) { titleEl.textContent = 'Stay tuned'; c.innerHTML = ''; return; }
  titleEl.textContent = `${target.title} — ${new Date(target.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  function tick() {
    const now = Date.now(), t = new Date(target.start).getTime() - now;
    if (t <= 0) { c.innerHTML = '<div class="k">Happening now</div>'; return; }
    const d = Math.floor(t / 86400000), h = Math.floor((t % 86400000) / 3600000), m = Math.floor((t % 3600000) / 60000), s = Math.floor((t % 60000) / 1000);
    c.innerHTML = `<div class="k">${d}<br/><small>days</small></div><div class="k">${h}<br/><small>hrs</small></div><div class="k">${m}<br/><small>min</small></div><div class="k">${s}<br/><small>sec</small></div>`;
  }
  tick(); clearInterval(startCountdown._int); startCountdown._int = setInterval(tick, 1000);
}
// Startup: load all JSON data then render the UI
/**
 * App bootstrap: fetch data in parallel, then render the UI.
 */
async function init() {
  // Show per-section placeholders immediately
  const coreHost = document.getElementById('coreCards');
  const boardHost = document.getElementById('boardCards');
  const vendorHost = document.getElementById('vendorGrid');
  const pastHost = document.getElementById('pastVLoop');
  const upHost = document.getElementById('upVLoop');
  const calGrid = document.getElementById('calendarGrid');
  const schedHost = document.getElementById('upcomingSchedule');
  if (coreHost) coreHost.innerHTML = '<div class="hint">Loading core team…</div>';
  if (boardHost) boardHost.innerHTML = '<div class="hint">Loading board…</div>';
  if (vendorHost) vendorHost.innerHTML = '<div class="hint">Loading vendors…</div>';
  if (pastHost) pastHost.innerHTML = '<div class="hint" style="padding:12px;">Loading events…</div>';
  if (upHost) upHost.innerHTML = '<div class="hint" style="padding:12px;">Loading events…</div>';
  if (calGrid) calGrid.innerHTML = '<div class="hint" style="grid-column: span 7; text-align:center;">Loading calendar…</div>';
  if (schedHost) schedHost.innerHTML = '';

  // Kick off data loads in parallel and render as each completes
  const pCore = loadCoreTeam().then(() => { renderCore(); });
  const pBoard = loadBoardMembers().then(() => { renderBoard(); });
  const pEvents = Promise.all([loadUpcomingEvents(), loadCompletedEvents()]).then(() => {
    renderCalendarAndEvents();
    startCountdown();
  });
  const pVendors = loadVendors().then(() => {
    renderVendors('All');
    renderVendorMarquee();
  });

  await Promise.all([pCore, pBoard, pEvents, pVendors]);
}

init();

/* ===================== DONATE INTERACTIONS ===================== */
const GOAL = 5000;
let raised = 2860;
let donors = 73;

function updateProgress() {
  const goalEl = document.getElementById('goalLbl');
  const raisedEl = document.getElementById('raisedLbl');
  const donorsEl = document.getElementById('donorsLbl');
  const bar = document.getElementById('donationBar');
  if (!goalEl || !raisedEl || !donorsEl || !bar) return;
  goalEl.textContent = `$${GOAL.toLocaleString()}`;
  raisedEl.textContent = `$${raised.toLocaleString()}`;
  donorsEl.textContent = donors.toLocaleString();
  const pct = Math.min(100, Math.round((raised / GOAL) * 100));
  requestAnimationFrame(() => { bar.style.width = pct + '%'; });
}
updateProgress();

const amountButtons = Array.from(document.querySelectorAll('.amount-btn'));
const customAmount = document.getElementById('customAmount');
let selectedAmount = null;

function setActive(btn) {
  amountButtons.forEach(b => b.classList.remove('active'));
  if (btn) { btn.classList.add('active'); selectedAmount = parseInt(btn.dataset.amt, 10); customAmount.value = ''; }
}
amountButtons.forEach(b => {
  b.addEventListener('click', () => setActive(b));
});
customAmount.addEventListener('input', () => {
  amountButtons.forEach(b => b.classList.remove('active'));
  const v = parseInt(customAmount.value || '0', 10);
  selectedAmount = isNaN(v) ? null : v;
});

function triggerFireworks() {
  const canvas = document.getElementById('fireworks-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = []; for (let i = 0; i < 160; i++) {
    particles.push({ x: canvas.width / 2, y: canvas.height / 2, vx: (Math.random() - 0.5) * 11, vy: (Math.random() - 0.5) * 11, size: Math.random() * 3 + 2, color: `hsl(${Math.random() * 360},100%,50%)`, life: 60 + Math.random() * 40 });
  }
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life -= 1;
      ctx.globalAlpha = Math.max(0, p.life / 100);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    if (particles.some(p => p.life > 0)) requestAnimationFrame(animate); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
}

const form = document.getElementById('donationForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('donorName').value.trim();
  const email = document.getElementById('donorEmail').value.trim();
  const monthly = document.getElementById('recurring').checked;

  let amount = selectedAmount || parseInt(customAmount.value || '0', 10);
  if (!amount || amount <= 0) { toast('Please choose or enter an amount'); return; }

  raised += amount;
  donors += 1;
  updateProgress();
  triggerFireworks();

  const threshold = 250;
  if (amount >= threshold) {
    injectDonorToLeaderboard({ name, amount });
  }

  toast(monthly ? `Thanks, ${name}! Monthly gift of $${amount}.` : `Thanks, ${name}! One-time gift of $${amount}.`);
  form.reset(); setActive(null); selectedAmount = null;
});

function injectDonorToLeaderboard({ name, amount }) {
  const list = document.getElementById('donorList');
  const newEl = document.createElement('div');
  newEl.className = 'donor';
  newEl.innerHTML = `
      <div class="avatar" aria-hidden="true">💛</div>
      <div>
        <div class="name">${name || 'Anonymous'}</div>
        <div class="hint">New supporter</div>
      </div>
      <div style="text-align:right;">
        <div class="amt">$${amount.toLocaleString()}</div>
        <div class="rank">New</div>
      </div>`;
  list.appendChild(newEl);
}

/* ===================== HERO PARALLAX MICRO-SWAY ==================== */
(function () {
  const wrap = document.getElementById('heroWrap'); const logo = document.getElementById('heroLogo');
  if (!wrap || !logo) return; let RAF = null;
  function onMove(e) {
    const r = wrap.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
    if (RAF) cancelAnimationFrame(RAF); RAF = requestAnimationFrame(() => { logo.style.transform = `translate(${x * 14}px, ${y * 14}px)`; });
  }
  wrap.addEventListener('pointermove', onMove);
})();

{
  const sweep = document.querySelector('.sunburst .sweep');
  if (sweep) sweep.style.setProperty('--beamspd', (8 + Math.random() * 6) + 's');
}

/* ========================= VENDORS JS ============================ */

function makeVendorCard(v) {
  const div = document.createElement('div');
  div.className = 'vendor-card';
  div.innerHTML = `
            <a href="${v.url}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">
                <img src="${v.logo}" alt="${v.name}">
                <div class="name">${v.name}</div>
                <div class="cat pill">${v.cat}</div>
                <div class="hint" style="margin-top:6px;">${v.blurb}</div>
            </a>`;
  const img = div.querySelector('img');
  if (img) {
    img.addEventListener('error', () => {
      const fallback = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop';
      if (img.src !== fallback) img.src = fallback;
    }, { once: true });
  }
  return div;
}

function renderVendors(filter = 'All') {
  const grid = document.getElementById('vendorGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const list = (Array.isArray(vendors) ? vendors : []).filter(v => filter === 'All' || v.cat === filter);
  if (list.length === 0) {
    grid.innerHTML = '<div class="hint">Vendors will be announced soon.</div>';
    return;
  }
  list.forEach(v => grid.appendChild(makeVendorCard(v)));
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-filter]');
  if (!btn) return;
  const val = btn.getAttribute('data-filter');
  renderVendors(val);
  toast(val === 'All' ? 'Showing all vendors' : 'Filtered: ' + val);
});

function renderVendorMarquee() {
  const track = document.getElementById('vendorMarquee');
  if (!track) return;
  if (!Array.isArray(vendors) || vendors.length === 0) return;
  function makeLogo(v) {
    const s = document.createElement('div'); s.className = 'gslide'; s.style.width = '280px'; s.style.height = '120px';
    const im = document.createElement('img'); im.src = v.logo; im.alt = v.name; im.loading = 'lazy'; im.decoding = 'async';
    im.onerror = () => { im.src = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop'; };
    const lb = document.createElement('div'); lb.className = 'label'; lb.textContent = v.name;
    s.appendChild(im); s.appendChild(lb); return s;
  }
  [...vendors, ...vendors].forEach(v => track.appendChild(makeLogo(v)));

  let x = 0; const speed = 0.5;
  function loop() {
    x -= speed;
    const halfWidth = track.scrollWidth / 2;
    if (Math.abs(x) >= halfWidth) { x = 0; }
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// Rendering is orchestrated in init() after data loads

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

/* ================== MOBILE NAV TOGGLE ================== */
(function () {
    const header = document.getElementById('siteHeader');
    const btn = document.getElementById('navToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const open = header.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
})();

/* ================== SCROLL PROGRESS & BACK-TO-TOP ================== */
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

/* ====================== BUTTON RIPPLE EFFECT ======================= */
document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn');
    if (!b) return;
    const r = document.createElement('span'); r.className = 'r';
    const rect = b.getBoundingClientRect(); r.style.left = (e.clientX - rect.left) + 'px'; r.style.top = (e.clientY - rect.top) + 'px';
    b.appendChild(r); setTimeout(() => r.remove(), 620);
});

/* =================== BACKGROUND ZOOM ON SCROLL ===================== */
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

/* ======================= REVEAL ON INTERSECT ======================= */
(function () {
    const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) e.target.classList.add('show'); }) }, { threshold: .22 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

/* ========================= DATA: EVENTS ============================ */
const upcomingEvents = [
    {
        id: 'evt_ganesh25', title: 'Ganesh Chaturthi',
        start: '2025-09-07T17:00:00', end: '2025-09-07T20:00:00', location: 'Menifee Community Center', price: 0,
        img: 'assets/events/ganesh.jpg',
        fallback: 'https://images.unsplash.com/photo-1600011689032-8c3e7b80eb75?q=80&w=1200&auto=format&fit=crop',
        desc: 'Community puja, aarthi, and prasadam. Family friendly.'
    },
    {
        id: 'evt_service25', title: 'Community Service Day',
        start: '2025-09-28T09:00:00', end: '2025-09-28T12:00:00', location: 'Alderwood Park', price: 0,
        img: 'assets/events/service-day.jpg',
        fallback: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=1200&auto=format&fit=crop',
        desc: 'Park clean-up & care packages. Service hours for students.'
    },
    {
        id: 'evt_navratri25', title: 'Navratri Garba Night',
        start: '2025-10-04T18:30:00', end: '2025-10-04T22:00:00', location: 'Heritage Lake Clubhouse', price: 15,
        img: 'assets/events/garba.jpg',
        fallback: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?q=80&w=1200&auto=format&fit=crop',
        desc: 'Traditional garba & dandiya. Dress in your best!'
    },
    {
        id: 'evt_mg_oct31', title: 'Meet & Greet',
        start: '2025-10-31T18:00:00', end: '2025-10-31T19:30:00', location: 'TBD', price: 0,
        img: 'assets/events/meet-greet.jpg',
        fallback: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop',
        desc: 'Casual networking and community-building session.'
    },
    {
        id: 'evt_diwali25', title: 'Diwali Mela & Cultural Night',
        tbd: true, location: 'TBD', price: 25,
        img: 'assets/events/diwali.jpg',
        fallback: 'https://images.unsplash.com/photo-1545424273-19f5aa36a2fa?q=80&w=1200&auto=format&fit=crop',
        desc: 'Festival of Lights — November (date TBD).'
    },
];
const completedEvents = [
    {
        id: 'past_pongal', title: 'Pongal Festival', date: '2025-01-18',
        img: 'assets/events/past-pongal.jpg',
        fallback: 'https://images.unsplash.com/photo-1542367597-8849eb00b2c2?q=80&w=1200&auto=format&fit=crop',
        summary: 'Harvest celebrations with traditional food & festivities.'
    },
    {
        id: 'past_ugadhi', title: 'Ugadhi', date: '2025-03-30',
        img: 'assets/events/past-ugadi.jpg',
        fallback: 'https://images.unsplash.com/photo-1578926374377-5a3f78c19c6f?q=80&w=1200&auto=format&fit=crop',
        summary: 'Telugu New Year with joy, culture, tradition.'
    },
    {
        id: 'past_independence', title: 'Independence Day Celebration', date: '2025-08-15',
        img: 'assets/events/past-independence.jpg',
        fallback: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?q=80&w=1200&auto=format&fit=crop',
        summary: "Pride, parade, and community spirit."
    },
];

function makeImage(src, fallback, alt) {
    const im = document.createElement('img');
    im.src = src; im.alt = alt || '';
    if (fallback) { im.onerror = () => { if (im.src !== fallback) im.src = fallback; }; }
    return im;
}

function buildVLoop(hostId, items, renderCard) {
    const host = document.getElementById(hostId);
    host.innerHTML = '';
    const track = document.createElement('div'); track.className = 'vtrack';
    const dup = document.createElement('div'); dup.className = 'vtrack';
    items.forEach((it, i) => track.appendChild(renderCard(it, i)));
    items.forEach((it, i) => dup.appendChild(renderCard(it, i + items.length)));
    const wrap = document.createElement('div'); wrap.style.display = 'grid'; wrap.style.gap = '16px';
    wrap.appendChild(track); wrap.appendChild(dup);
    host.appendChild(wrap);
}

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
function makeICSDataURI(ev) {
    const dt = (s) => new Date(s).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = ev.id + '@aikyam';
    const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aikyam//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        `UID:${uid}`, `DTSTAMP:${dt(new Date())}`, `DTSTART:${dt(ev.start)}`, `DTEND:${dt(ev.end)}`,
        `SUMMARY:${ev.title}`, `LOCATION:${ev.location}`, `DESCRIPTION:${ev.desc}`,
        'END:VEVENT', 'END:VCALENDAR'
    ].join('\\r\\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}
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
// Small utility: fetch JSON with a safe fallback when network or file isn't available
async function fetchJSONWithFallback(url, fallback = []) {
    try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) {
            console.warn('fetchJSONWithFallback: non-OK response', url, res.status);
            return fallback;
        }
        const data = await res.json();
        return data;
    } catch (err) {
        console.warn('fetchJSONWithFallback: error fetching', url, err);
        return fallback;
    }
}

// core team: load from data/coreTeam.json in the browser (fallback if fetch fails)
let coreTeam = [];
let coreLoaded = false;
async function loadCoreTeam() {
    coreTeam = await fetchJSONWithFallback('./data/coreTeam.json', []);
    coreLoaded = Array.isArray(coreTeam) && coreTeam.length > 0;
    console.info('loadCoreTeam:', coreLoaded ? 'loaded' : 'fallback', coreTeam.length || 0);
    // update debug banner if present
    const ds = document.getElementById('dataStatus');
    if (ds) ds.textContent = `coreTeam: ${coreLoaded ? 'loaded' : 'fallback'} (${coreTeam.length || 0})`;
    renderCore();
}

function renderCore() {
    const host = document.getElementById('coreCards');
    if (!host) return;
    if (!coreLoaded) {
        host.innerHTML = '<div class="hint">Loading core team…</div>';
        return;
    }
    host.innerHTML = coreTeam.map(m => (
        `<div class="person-card">
        <img src="${m.img}" alt="${m.name}">
        <div class="name">${m.name}</div>
        <div class="role">${m.role}</div>
        <div style="margin-top:10px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap">
          <span class="chip-mini">Menifee, CA</span>
        </div>
      </div>`
    )).join('');
}

const boardMembers = [
    { name: 'Balaram Singamsetty (Bala)', role: 'Board of Director', img: 'assets/people/bala.jpg' },
    { name: 'Raju Kakani', role: 'Board of Director', img: 'assets/people/raju.jpg' },
    { name: 'Vijay Jestadi', role: 'Board of Director', img: 'assets/people/vijay.jpg' },
    { name: 'Ramarao Rimmalapudi', role: 'Board of Director', img: 'assets/people/ramarao.jpg' },
    { name: 'Ravi Jampana', role: 'Board of Director', img: 'assets/people/ravi.jpg' },
];
function renderBoard() {
    document.getElementById('boardCards').innerHTML = boardMembers.map(m => (
        `<div class="person-card">
        <img src="${m.img}" alt="${m.name}">
        <div class="name">${m.name}</div>
        <div class="role">${m.role}</div>
      </div>`
    )).join('');
}

function sameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
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
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLbl = document.getElementById('calendarMonth');
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

function toast(msg, ms = 1400) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._h);
    toast._h = setTimeout(() => t.classList.remove('show'), ms);
}

/* =================== GALLERY MARQUEE =================== */
(function () {
    const images = [
        { src: 'pictures/1.jpg', label: 'Moment 1', fallback: 'https://images.unsplash.com/photo-1548020356-5a6d8924b7f8?q=80&w=1200&auto=format&fit=crop' },
        { src: 'pictures/2.jpg', label: 'Moment 2', fallback: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop' },
        { src: 'pictures/3.jpg', label: 'Moment 3', fallback: 'https://images.unsplash.com/photo-1520975922284-5fbc8da7e2f3?q=80&w=1200&auto=format&fit=crop' },
        { src: 'pictures/4.jpg', label: 'Moment 4', fallback: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1200&auto=format&fit=crop' },
    ];
    const track = document.getElementById('gtrack');
    function makeSlide(it) {
        const s = document.createElement('div'); s.className = 'gslide';
        const im = document.createElement('img'); im.src = it.src; im.alt = it.label;
        im.onerror = () => { if (it.fallback && im.src !== it.fallback) im.src = it.fallback; };
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

function renderCalendarAndEvents() {
    renderCalendar();
    buildVLoop('pastVLoop', completedEvents, renderPastCard);
    buildVLoop('upVLoop', upcomingEvents, renderUpcomingCard);
}
function startCountdown() {
    const target = upcomingEvents.filter(e => !e.tbd && e.start && new Date(e.start).getTime() > Date.now())
        .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
    const titleEl = document.getElementById('nextEventTitle');
    const c = document.getElementById('countdown');
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
// Load core team then render board and other UI pieces
loadCoreTeam();
renderBoard();
renderCalendarAndEvents();
startCountdown();

/* ===================== DONATE INTERACTIONS ===================== */
const GOAL = 5000;
let raised = 2860;
let donors = 73;

function updateProgress() {
    document.getElementById('goalLbl').textContent = `$${GOAL.toLocaleString()}`;
    document.getElementById('raisedLbl').textContent = `$${raised.toLocaleString()}`;
    document.getElementById('donorsLbl').textContent = donors.toLocaleString();
    const pct = Math.min(100, Math.round((raised / GOAL) * 100));
    requestAnimationFrame(() => { document.getElementById('donationBar').style.width = pct + '%'; });
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

document.querySelector('.sunburst .sweep').style.setProperty('--beamspd', (8 + Math.random() * 6) + 's');

/* ========================= VENDORS JS ============================ */
const vendors = [
    { name: 'Menifee Motors', cat: 'Services', logo: 'assets/vendors/menifee-motors.jpg', url: '#', blurb: 'Trusted local auto care & sponsors.' },
    { name: 'Spice Route Kitchen', cat: 'Food', logo: 'assets/vendors/spice-route.jpg', url: '#', blurb: 'Homestyle Indian meals & catering.' },
    { name: 'Little Learners Academy', cat: 'Education', logo: 'assets/vendors/learners.jpg', url: '#', blurb: 'After-school & tutoring programs.' },
    { name: 'Saree & Shine Boutique', cat: 'Boutique', logo: 'assets/vendors/saree-shine.jpg', url: '#', blurb: 'Ethnic wear, jewelry & gifts.' },
    { name: 'Chai Junction', cat: 'Food', logo: 'assets/vendors/chai-junction.jpg', url: '#', blurb: 'Masala chai, snacks & sweets.' },
    { name: 'Heritage Lake Realty', cat: 'Services', logo: 'assets/vendors/heritage-realty.jpg', url: '#', blurb: 'Neighborhood real estate experts.' },
];

function makeVendorCard(v) {
    const div = document.createElement('div');
    div.className = 'vendor-card';
    div.innerHTML = `
      <a href="${v.url}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">
        <img src="${v.logo}" alt="${v.name}" onerror="if(this.src.indexOf('unsplash')===-1){this.src='https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop'}">
        <div class="name">${v.name}</div>
        <div class="cat pill">${v.cat}</div>
        <div class="hint" style="margin-top:6px;">${v.blurb}</div>
      </a>`;
    return div;
}

function renderVendors(filter = 'All') {
    const grid = document.getElementById('vendorGrid');
    if (!grid) return;
    grid.innerHTML = '';
    vendors
        .filter(v => filter === 'All' || v.cat === filter)
        .forEach(v => grid.appendChild(makeVendorCard(v)));
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
    function makeLogo(v) {
        const s = document.createElement('div'); s.className = 'gslide'; s.style.width = '280px'; s.style.height = '120px';
        const im = document.createElement('img'); im.src = v.logo; im.alt = v.name;
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

renderVendors('All');
renderVendorMarquee();

/*
  AIKYAM Website — Minimal Script for Core Team & Events
  - Simple, direct data loading
  - No complex initialization
*/


/* ===================== UTILITY FUNCTIONS ==================== */

/* ===================== HEADER LOADING ==================== */
async function loadHeader() {
  try {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) {
      // Standalone launch header support: initialize nav if inline header exists
      const launchHeader = document.querySelector('header[data-launch-header]');
      if (launchHeader) {
        initMobileNav();
        setActiveNavItem();
      }
      return;
    }
    
    const response = await fetch('./common/header.html');
    if (!response.ok) {
      console.error('AIKYAM: Failed to fetch header:', response.status);
      return;
    }
    
    const headerHTML = await response.text();
    headerPlaceholder.innerHTML = headerHTML;
    // Anchor navigation fallback: if target section missing on current page (e.g., launch.html), redirect to index.html#section
    const hashLinks = headerPlaceholder.querySelectorAll('.nav-links a[href^="#"]');
    hashLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const hash = link.getAttribute('href');
        const id = hash.slice(1);
        if (!document.getElementById(id)) {
          e.preventDefault();
          window.location.href = 'index.html' + hash;
        }
      });
    });
    
    // Reinitialize mobile navigation after header is loaded
    initMobileNav();
    
    // Set active navigation item
    setActiveNavItem();
    
    // For home page, also check scroll position
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || currentPage === '') {
      setTimeout(updateActiveNavOnScroll, 100); // Small delay to ensure DOM is ready
    }
  } catch (error) {
    console.error('AIKYAM: Error loading header:', error);
  }
}

/* ===================== FOOTER LOADING ==================== */
async function loadFooter() {
  try {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) {
      console.error('AIKYAM: Footer placeholder not found');
      return;
    }
    
    const response = await fetch('./common/footer.html');
    if (!response.ok) {
      console.error('AIKYAM: Failed to fetch footer:', response.status);
      return;
    }
    
    const footerHTML = await response.text();
    footerPlaceholder.innerHTML = footerHTML;
  } catch (error) {
    console.error('AIKYAM: Error loading footer:', error);
  }
}

/* ===================== THEME INITIALIZATION ==================== */
(function initTheme() {
  const saved = localStorage.getItem('AIKYAM_theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light');
})();

/* ================== SCROLL PROGRESS & BACK-TO-TOP ================== */
function initScrollProgress() {
  const btn = document.getElementById('toTop');
  const prog = document.getElementById('scroll-progress');
  if (!btn || !prog) return;
  
  function onScroll() {
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.max(0, Math.min(1, y / h));
    prog.style.width = (pct * 100) + '%';
    if (y > 280) btn.classList.add('show'); 
    else btn.classList.remove('show');
  }
  
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ====================== BUTTON RIPPLE EFFECT ======================= */
function initButtonRipple() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn');
    if (!b) return;
    
    // Special handling for register buttons to prevent size/transform accumulation
    if (b.href && b.href.includes('#register')) {
      // Prevent multiple rapid clicks
      if (b.dataset.clicking === '1') {
        e.preventDefault();
        return;
      }
      
      // Mark as clicking and reset transforms
      b.dataset.clicking = '1';
      b.style.transform = '';
      
      // Add click effect class temporarily
      b.classList.add('btn-click-effect');
      
      setTimeout(() => {
        b.classList.remove('btn-click-effect');
        b.dataset.clicking = '0';
        // Ensure transform is cleared
        b.style.transform = '';
      }, 200);
    }
    
    // Limit concurrent ripples to prevent layout issues
    const existingRipples = b.querySelectorAll('.r');
    if (existingRipples.length > 1) return;
    
    const r = document.createElement('span');
    r.className = 'r';
    const rect = b.getBoundingClientRect();
    r.style.left = (e.clientX - rect.left) + 'px';
    r.style.top = (e.clientY - rect.top) + 'px';
    b.appendChild(r);
    setTimeout(() => r.remove(), 620);
  });
}

/* =================== BACKGROUND ZOOM ON SCROLL ===================== */
function initBackgroundZoom() {
  const img = document.getElementById('bgZoomImg');
  if (!img) return;
  
  function onScroll() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const p = window.scrollY / max;
    const scale = 1 + p * 0.8;
    img.style.transform = `scale(${scale})`;
  }
  
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ======================= REVEAL ON INTERSECT ======================= */
function initRevealOnScroll() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('show');
    });
  }, { threshold: 0.22 });
  
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// Theme toggle
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('AIKYAM_theme', document.body.classList.contains('light') ? 'light' : 'dark');
  });
}

// Mobile navigation
function initMobileNav() {
  const header = document.getElementById('siteHeader');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (!navToggle || !navLinks || !header) return;
  
  const closeMenu = () => { 
    header.classList.remove('open'); 
    navToggle.setAttribute('aria-expanded', 'false'); 
  };
  
  const toggleMenu = () => {
    const open = header.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  navToggle.addEventListener('click', toggleMenu);
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  
  document.addEventListener('click', (e) => {
    if (!header.classList.contains('open')) return;
    if (!header.contains(e.target)) closeMenu();
  });
  
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  });
}

// Set active navigation item based on current page
function setActiveNavItem() {
  const navLinks = document.querySelectorAll('.nav-links a');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const currentHash = window.location.hash;
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    
    const linkHref = link.getAttribute('href');
    const linkPage = linkHref.split('#')[0].split('/').pop();
    const linkHash = linkHref.includes('#') ? '#' + linkHref.split('#')[1] : '';
    
    // For non-home pages, just match the page
    if (currentPage !== 'index.html' && currentPage !== '') {
      if (linkPage === currentPage) {
        link.classList.add('active');
      }
    } 
    // For home page, handle differently
    else {
      // If there's a hash in URL, match it exactly
      if (currentHash && linkHash === currentHash) {
        link.classList.add('active');
      }
      // If no hash and link is to home without hash, activate it
      else if (!currentHash && (linkHref === 'index.html' || linkHref.includes('index.html#home'))) {
        link.classList.add('active');
      }
    }
  });
}

// Update active nav based on scroll position (for home page)
function updateActiveNavOnScroll() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Only run on home page
  if (currentPage !== 'index.html' && currentPage !== '') {
    return;
  }
  
  const sections = ['home', 'team', 'events', 'reviews-section'];
  const navLinks = document.querySelectorAll('.nav-links a');
  let activeSection = 'home'; // default
  
  // Find which section is currently in view
  for (const sectionId of sections) {
    const section = document.getElementById(sectionId);
    if (section) {
      const rect = section.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      
      // Check if section is in viewport (at least 30% visible)
      if (rect.top <= viewHeight * 0.3 && rect.bottom >= viewHeight * 0.3) {
        activeSection = sectionId;
      }
    }
  }
  
  // Update navigation
  navLinks.forEach(link => {
    link.classList.remove('active');
    const linkHref = link.getAttribute('href');
    
    if (linkHref.includes('#' + activeSection)) {
      link.classList.add('active');
    }
  });
}

// Global vendors storage for filtering
let globalVendors = [];

// Simple data loading and rendering
async function loadData() {
  
  try {
    // Load core team with error handling
    const coreResponse = await fetch('./data/coreTeam.json');
    if (!coreResponse.ok) {
      throw new Error(`Failed to load core team data: ${coreResponse.status}`);
    }
    const coreTeam = await coreResponse.json();
    
    // Render core team
    const coreContainer = document.getElementById('coreCards');
    if (coreContainer && Array.isArray(coreTeam)) {
      coreContainer.innerHTML = '';
      coreTeam.forEach(member => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML = `
          <img src="${member.img}" alt="${member.name}" width="180" height="180" loading="lazy">
          <div class="name">${member.name}</div>
          <div class="role">${member.role}</div>
        `;
        
        // Add themed fallback for missing images
        const img = card.querySelector('img');
        if (img) {
          img.addEventListener('error', () => {
            const initials = member.name.split(' ').map(word => word[0]).join('').slice(0, 2);
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
              width: 180px;
              height: 180px;
              background: linear-gradient(135deg, #ffcc00, #ff9900);
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              color: #000;
              font-weight: bold;
              font-size: 36px;
              text-align: center;
              margin: 0 auto 16px auto;
              box-shadow: 0 8px 24px rgba(255, 204, 0, 0.3);
            `;
            placeholder.textContent = initials;
            img.replaceWith(placeholder);
          }, { once: true });
        }
        
        coreContainer.appendChild(card);
      });
    }

    // Attempt to load 2026 core team placed under Events section
    const core2026Container = document.getElementById('coreTeam2026Cards');
    if (core2026Container) {
      try {
        const core2026Response = await fetch('./data/coreTeam2026.json');
        if (core2026Response.ok) {
          const coreTeam2026 = await core2026Response.json();
          if (Array.isArray(coreTeam2026)) {
            core2026Container.innerHTML = '';
            coreTeam2026.forEach(member => {
              const card = document.createElement('div');
              card.className = 'person-card';
              card.innerHTML = `
                <img src="${member.img}" alt="${member.name}" width="180" height="180" loading="lazy">
                <div class="name">${member.name}</div>
                <div class="role">${member.role}</div>
              `;
              const img = card.querySelector('img');
              if (img) {
                img.addEventListener('error', () => {
                  const initials = member.name.split(' ').map(w => w[0]).join('').slice(0,2);
                  const placeholder = document.createElement('div');
                  placeholder.style.cssText = `
                    width: 180px;
                    height: 180px;
                    background: linear-gradient(135deg, #ffcc00, #ff9900);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    color: #000;
                    font-weight: bold;
                    font-size: 36px;
                    text-align: center;
                    margin: 0 auto 16px auto;
                    box-shadow: 0 8px 24px rgba(255, 204, 0, 0.3);
                  `;
                  placeholder.textContent = initials;
                  img.replaceWith(placeholder);
                }, { once: true });
              }
              core2026Container.appendChild(card);
            });
              if (coreTeam2026.length === 0) {
                core2026Container.innerHTML = '<div class="hint" style="padding:24px;text-align:center;">No Executive Committee members for 2026 yet.</div>';
              }
          }
            else {
              core2026Container.innerHTML = '<div class="hint" style="padding:24px;text-align:center;">Executive Committee 2026 data format error.</div>';
            }
        } else {
          // Non-fatal: leave container empty if 404 or error
            core2026Container.innerHTML = `<div class="hint" style="padding:24px;text-align:center;">Executive Committee 2026 data not found (${core2026Response.status}).</div>`;
            console.warn('Core Team 2026 data not found:', core2026Response.status);
        }
      } catch (e) {
          core2026Container.innerHTML = `<div class="hint" style="padding:24px;text-align:center;">Error loading Executive Committee 2026: ${e.message}</div>`;
          console.warn('Failed loading Core Team 2026:', e.message);
      }
    }
    
    // Load events
    const upcomingResponse = await fetch('./data/upcomingEvents.json');
    const upcomingEvents = await upcomingResponse.json();
    const completedResponse = await fetch('./data/completedEvents.json');
    const completedEvents = await completedResponse.json();
    
    // Render past events
    const pastContainer = document.getElementById('pastVLoop');
    if (pastContainer && Array.isArray(completedEvents)) {
      pastContainer.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'vtrack';
      
      // Duplicate events multiple times for continuous scrolling effect
      const duplicatedEvents = [...completedEvents, ...completedEvents, ...completedEvents];
      duplicatedEvents.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
          <div class="event-image">
            <img src="${event.img}" alt="${event.title}" loading="lazy" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
          </div>
          <div class="event-title">${event.title}</div>
          <div class="event-meta">
            <span class="pill">Completed</span>
            <span>${new Date(event.date).toLocaleDateString()}</span>
          </div>
          <div class="event-desc">${event.summary}</div>
        `;
        
        // Add fallback handling for event images
        const img = card.querySelector('img');
        if (img) {
          let fallbackTried = false;
          img.addEventListener('error', () => {
            if (!fallbackTried && event.fallback) {
              fallbackTried = true;
              img.src = event.fallback;
            } else {
              // Create themed placeholder
              const initials = event.title.split(' ').map(word => word[0]).join('').slice(0, 2);
              const placeholder = document.createElement('div');
              placeholder.style.cssText = `
                width: 100%;
                height: 200px;
                background: linear-gradient(135deg, #ffcc00, #ff9900);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                color: #000;
                font-weight: bold;
                font-size: 24px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
              `;
              placeholder.textContent = initials;
              img.replaceWith(placeholder);
            }
          }, { once: false });
        }
        
        wrapper.appendChild(card);
      });
      pastContainer.appendChild(wrapper);
    }
    
    // Render upcoming events
    const upcomingContainer = document.getElementById('upVLoop');
    if (upcomingContainer && Array.isArray(upcomingEvents)) {
      upcomingContainer.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'vtrack';
      
      // Duplicate events multiple times for continuous scrolling effect
      const duplicatedUpcoming = [...upcomingEvents, ...upcomingEvents, ...upcomingEvents];
      duplicatedUpcoming.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        const when = event.tbd ? 'Date TBD' : new Date(event.start).toLocaleString([], { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        card.innerHTML = `
          <div class="event-image">
            <img src="${event.img}" alt="${event.title}" loading="lazy" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
          </div>
          <div class="event-title">${event.title}</div>
          <div class="event-meta">
            <span class="pill">${event.tbd ? 'TBD' : 'Upcoming'}</span>
            <span>${event.tbd ? 'To be announced' : when}</span>
          </div>
          <div class="event-desc">${event.location || 'TBD'} • ${event.price > 0 ? '$' + event.price : 'Free'}</div>
          <div class="event-actions" style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
            ${event.tbd ? '' : `<button class="btn mini secondary add-to-cal-btn" data-event-id="${event.id}">📅 Add to Calendar</button>`}
            ${event.tbd ? '' : `<a class="btn mini outline" href="#register">Register</a>`}
          </div>
        `;
        
        // Add fallback handling for event images
        const img = card.querySelector('img');
        if (img) {
          let fallbackTried = false;
          img.addEventListener('error', () => {
            if (!fallbackTried && event.fallback) {
              fallbackTried = true;
              img.src = event.fallback;
            } else {
              // Create themed placeholder
              const initials = event.title.split(' ').map(word => word[0]).join('').slice(0, 2);
              const placeholder = document.createElement('div');
              placeholder.style.cssText = `
                width: 100%;
                height: 200px;
                background: linear-gradient(135deg, #ffcc00, #ff9900);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                color: #000;
                font-weight: bold;
                font-size: 24px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
              `;
              placeholder.textContent = initials;
              img.replaceWith(placeholder);
            }
          }, { once: false });
        }
        
        // Add click handler for "Add to Calendar" button
        if (!event.tbd) {
          const addCalBtn = card.querySelector('.add-to-cal-btn');
          if (addCalBtn) {
            addCalBtn.addEventListener('click', (e) => {
              e.preventDefault();
              showAddToCalendarOptions(event);
            });
          }
        }
        
        wrapper.appendChild(card);
      });
      upcomingContainer.appendChild(wrapper);
    }
    
    // Load and render board members
    const boardResponse = await fetch('./data/boardMembers.json');
    const boardData = await boardResponse.json();
    
    // Render chairman separately
    const chairmanContainer = document.getElementById('chairmanCard');
    if (chairmanContainer && boardData.chairman) {
      chairmanContainer.innerHTML = '';
      const member = boardData.chairman;
      const card = document.createElement('div');
      card.className = 'person-card';
      card.innerHTML = `
        <img src="${member.img}" alt="${member.name}" width="180" height="180" loading="lazy">
        <div class="name">${member.name}</div>
        <div class="role">${member.role}</div>
      `;
      
      // Add themed fallback for missing images
      const img = card.querySelector('img');
      if (img) {
        img.addEventListener('error', () => {
          const initials = member.name.split(' ').map(word => word[0]).join('').slice(0, 2);
          const placeholder = document.createElement('div');
          placeholder.style.cssText = `
            width: 180px;
            height: 180px;
            background: linear-gradient(135deg, #ffcc00, #ff9900);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            color: #000;
            font-weight: bold;
            font-size: 36px;
            text-align: center;
            margin: 0 auto 16px auto;
            box-shadow: 0 8px 24px rgba(255, 204, 0, 0.3);
          `;
          placeholder.textContent = initials;
          img.replaceWith(placeholder);
        }, { once: true });
      }
      
      chairmanContainer.appendChild(card);
    }
    
    // Render other board members
    const boardContainer = document.getElementById('boardCards');
    if (boardContainer && Array.isArray(boardData.members)) {
      boardContainer.innerHTML = '';
      boardData.members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML = `
          <img src="${member.img}" alt="${member.name}" width="180" height="180" loading="lazy">
          <div class="name">${member.name}</div>
          <div class="role">${member.role}</div>
        `;
        
        // Add themed fallback for missing images
        const img = card.querySelector('img');
        if (img) {
          img.addEventListener('error', () => {
            const initials = member.name.split(' ').map(word => word[0]).join('').slice(0, 2);
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
              width: 180px;
              height: 180px;
              background: linear-gradient(135deg, #ffcc00, #ff9900);
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              color: #000;
              font-weight: bold;
              font-size: 36px;
              text-align: center;
              margin: 0 auto 16px auto;
              box-shadow: 0 8px 24px rgba(255, 204, 0, 0.3);
            `;
            placeholder.textContent = initials;
            img.replaceWith(placeholder);
          }, { once: true });
        }
        
        boardContainer.appendChild(card);
      });
      // If exactly three board members, apply single-row layout modifier
      if (boardData.members.length === 3) {
        // Ensure base class present then apply modifier
        if (!boardContainer.classList.contains('board-cards')) {
          boardContainer.classList.add('board-cards');
        }
        boardContainer.classList.add('board-cards--single-row');
      }
    }
    
    // Render calendar
    renderCalendar(upcomingEvents);
    
    // Load and render vendors
    const vendorsResponse = await fetch('./data/vendors.json');
    if (!vendorsResponse.ok) {
      throw new Error(`Failed to load vendors data: ${vendorsResponse.status}`);
    }
    globalVendors = await vendorsResponse.json();
    
    if (!Array.isArray(globalVendors)) {
      throw new Error('Vendors data is not in expected format');
    }
    
    // Generate dynamic filter buttons based on JSON data
    generateVendorFilters(globalVendors);
    
    // Render vendor grid
    renderVendors(globalVendors, 'All');
    
    // Setup vendor filtering
    setupVendorFilters();
    
    // Start countdown for next event
    startCountdown(upcomingEvents);
    
    
  } catch (error) {
    // Show user-friendly error message instead of console error
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      background: #ff4444; color: white; padding: 12px 20px;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: var(--font-body); font-size: 14px; max-width: 300px;
    `;
    errorContainer.textContent = 'Unable to load some content. Please refresh the page.';
    document.body.appendChild(errorContainer);
    
    // Auto-remove error after 5 seconds
    setTimeout(() => {
      if (errorContainer.parentNode) {
        errorContainer.parentNode.removeChild(errorContainer);
      }
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  
  // Load header and footer first
  await loadHeader();
  await loadFooter();
  
  // Initialize all UI components
  initScrollProgress();
  initButtonRipple();
  initBackgroundZoom();
  initRevealOnScroll();
  // Legacy marquee (only runs if #gtrack exists on a page)
  initGalleryMarquee();
  setTimeout(initReviewsMarquee, 100);
  initHeroParallax();
  initSunburst();
  initThemeToggle();
  // Note: initMobileNav is called after header loads, not here
  initVendorFilters();
  
  // Add scroll listener for navigation highlighting (home page only)
  window.addEventListener('scroll', updateActiveNavOnScroll);
  
  // Load data (teams, events, vendors, etc.)
  await loadData();

  // Dynamic gallery load if gallery page present
  if (document.getElementById('galleryGrid')) {
    await loadGallery();
  }

  // Global hash fallback for anchors outside the header (e.g., hero "See Events" on launch page)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    const id = hash.slice(1);
    if (!document.getElementById(id)) {
      e.preventDefault();
      window.location.href = 'index.html' + hash;
    }
  });
});

/* ===================== HERO PARALLAX MICRO-SWAY ==================== */
function initHeroParallax() {
  const wrap = document.getElementById('heroWrap');
  const logo = document.getElementById('heroLogo');
  if (!wrap || !logo) return;
  
  let RAF = null;
  function onMove(e) {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (RAF) cancelAnimationFrame(RAF);
    RAF = requestAnimationFrame(() => {
      logo.style.transform = `translate(${x * 14}px, ${y * 14}px)`;
    });
  }
  wrap.addEventListener('pointermove', onMove);
}

/* ===================== SUNBURST ANIMATION ==================== */
function initSunburst() {
  const sweep = document.querySelector('.sunburst .sweep');
  if (sweep) {
    sweep.style.setProperty('--beamspd', (8 + Math.random() * 6) + 's');
  }
}

/* ===================== CALENDAR RENDERING ==================== */
function renderCalendar(upcomingEvents) {
  const grid = document.getElementById('calendarGrid');
  const monthLbl = document.getElementById('calendarMonth');
  const schedHost = document.getElementById('upcomingSchedule');
  
  if (!grid || !monthLbl) return;
  
  const now = new Date();
  const focus = new Date(now.getFullYear(), now.getMonth(), 1);
  monthLbl.textContent = focus.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const startDow = (focus.getDay() + 7) % 7;
  const daysInMonth = new Date(focus.getFullYear(), focus.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  
  // Create event date map
  const eventMap = {};
  if (Array.isArray(upcomingEvents)) {
    upcomingEvents.forEach(ev => {
      if (!ev.tbd && ev.start) {
        const d = new Date(ev.start);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        eventMap[key] = (eventMap[key] || 0) + 1;
      }
    });
  }

  grid.innerHTML = '';
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    const dayNum = i - startDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    if (!inMonth) {
      cell.classList.add('mute');
      cell.textContent = '';
    } else {
      cell.textContent = dayNum;
      const d = new Date(focus.getFullYear(), focus.getMonth(), dayNum);
      if (eventMap[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`]) {
        cell.classList.add('has');
      }
      if (sameDate(d, now)) {
        cell.style.outline = '2px solid rgba(255,204,0,.7)';
      }
    }
    grid.appendChild(cell);
  }
  
  // Render upcoming schedule
  if (schedHost && Array.isArray(upcomingEvents)) {
    const soon = upcomingEvents.slice().sort((a, b) => {
      const A = a.tbd ? Infinity : new Date(a.start).getTime();
      const B = b.tbd ? Infinity : new Date(b.start).getTime();
      return A - B;
    });
    
    schedHost.innerHTML = '';
    soon.forEach(ev => {
      const d = ev.tbd ? null : new Date(ev.start);
      const dt = ev.tbd ? 'Date TBD' : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      const item = document.createElement('div');
      item.className = 'sch-item';
      item.innerHTML = `
        <div class="t">${ev.title}</div>
        <div class="d">${dt} — ${ev.location || 'TBD'} • ${ev.price > 0 ? '$' + ev.price : 'Free'}</div>
        <div class="a">
          ${ev.tbd ? '' : `<button class="btn mini secondary add-to-cal-btn" data-event-id="${ev.id}">📅 Add to Calendar</button>`}
          ${ev.tbd ? '' : `<a class="btn mini outline" href="#register">Register</a>`}
        </div>
      `;
      
      // Add click handler for "Add to Calendar" button
      if (!ev.tbd) {
        const addCalBtn = item.querySelector('.add-to-cal-btn');
        if (addCalBtn) {
          addCalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAddToCalendarOptions(ev);
          });
        }
      }
      
      schedHost.appendChild(item);
    });
  }
  
}

// Add to Calendar functionality
function showAddToCalendarOptions(event) {
  // Create modal/dropdown for calendar options
  const modal = document.createElement('div');
  modal.className = 'add-to-cal-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: var(--bg);
    border: 1px solid var(--brd);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow);
  `;
  
  // Format event details for calendar
  const startDate = new Date(event.start);
  const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours if no end time
  
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const eventTitle = encodeURIComponent(event.title);
  const eventDesc = encodeURIComponent(event.desc || 'AIKYAM Community Event');
  const eventLocation = encodeURIComponent(event.location || '');
  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);
  
  // Generate calendar URLs
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startFormatted}/${endFormatted}&details=${eventDesc}&location=${eventLocation}`;
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${eventTitle}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${eventDesc}&location=${eventLocation}`;
  const yahooUrl = `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${eventTitle}&st=${startFormatted}&dur=0200&desc=${eventDesc}&in_loc=${eventLocation}`;
  
  content.innerHTML = `
    <h3 style="margin: 0 0 16px 0; color: var(--fg);">Add "${event.title}" to Calendar</h3>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <a href="${googleUrl}" target="_blank" class="cal-option" style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--card);
        border-radius: 8px;
        text-decoration: none;
        color: var(--fg);
        border: 1px solid var(--brd);
        transition: all 0.2s ease;
      ">
        <span style="font-size: 20px;">📧</span>
        <span>Google Calendar</span>
      </a>
      <a href="${outlookUrl}" target="_blank" class="cal-option" style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--card);
        border-radius: 8px;
        text-decoration: none;
        color: var(--fg);
        border: 1px solid var(--brd);
        transition: all 0.2s ease;
      ">
        <span style="font-size: 20px;">🏢</span>
        <span>Outlook Calendar</span>
      </a>
      <a href="${yahooUrl}" target="_blank" class="cal-option" style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--card);
        border-radius: 8px;
        text-decoration: none;
        color: var(--fg);
        border: 1px solid var(--brd);
        transition: all 0.2s ease;
      ">
        <span style="font-size: 20px;">🟡</span>
        <span>Yahoo Calendar</span>
      </a>
      <button class="close-modal" style="
        margin-top: 8px;
        padding: 8px 16px;
        background: transparent;
        border: 1px solid var(--brd);
        border-radius: 6px;
        color: var(--muted);
        cursor: pointer;
      ">Close</button>
    </div>
  `;
  
  // Add hover effects
  const options = content.querySelectorAll('.cal-option');
  options.forEach(option => {
    option.addEventListener('mouseenter', () => {
      option.style.background = 'var(--accent)';
      option.style.color = '#000';
    });
    option.addEventListener('mouseleave', () => {
      option.style.background = 'var(--card)';
      option.style.color = 'var(--fg)';
    });
  });
  
  // Close modal functionality
  const closeModal = () => document.body.removeChild(modal);
  content.querySelector('.close-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  modal.appendChild(content);
  document.body.appendChild(modal);
}

/** Date-only equality check. */
function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && 
         a.getMonth() === b.getMonth() && 
         a.getDate() === b.getDate();
}

/* ===================== COUNTDOWN TO NEXT EVENT ==================== */
function startCountdown(upcomingEvents) {
  const titleEl = document.getElementById('nextEventTitle');
  const countdownEl = document.getElementById('countdown');
  
  if (!titleEl || !countdownEl || !Array.isArray(upcomingEvents)) return;
  
  // Find next upcoming event (not TBD)
  const target = upcomingEvents
    .filter(e => !e.tbd && e.start && new Date(e.start).getTime() > Date.now())
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  
  if (!target) {
    titleEl.textContent = 'Stay tuned';
    countdownEl.innerHTML = '';
    return;
  }
  
  titleEl.textContent = `${target.title} — ${new Date(target.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  
  function tick() {
    const now = Date.now();
    const targetTime = new Date(target.start).getTime();
    const timeLeft = targetTime - now;
    
    if (timeLeft <= 0) {
      countdownEl.innerHTML = '<div class=\"k\">Happening now</div>';
      return;
    }
    
    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft % 86400000) / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    countdownEl.innerHTML = `
      <div class=\"k\">${days}<br/><small>days</small></div>
      <div class=\"k\">${hours}<br/><small>hrs</small></div>
      <div class=\"k\">${minutes}<br/><small>min</small></div>
      <div class=\"k\">${seconds}<br/><small>sec</small></div>
    `;
  }
  
  tick();
  // Clear any existing interval and start new one
  if (startCountdown._interval) clearInterval(startCountdown._interval);
  startCountdown._interval = setInterval(tick, 1000);
  
}

/* ===================== GALLERY MARQUEE ==================== */
function initGalleryMarquee() {
  const images = [
    { src: 'assets/gallery/Gallery1.jpg', label: 'Moment 1', fallback: 'https://images.unsplash.com/photo-1548020356-5a6d8924b7f8?q=80&w=1200&auto=format&fit=crop' },
    { src: 'assets/gallery/Gallery2.jpg', label: 'Moment 2', fallback: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop' },
    { src: 'assets/gallery/Gallery3.jpg', label: 'Moment 3', fallback: 'https://images.unsplash.com/photo-1520975922284-5fbc8da7e2f3?q=80&w=1200&auto=format&fit=crop' },
    { src: 'assets/gallery/Gallery4.jpg', label: 'Moment 4', fallback: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1200&auto=format&fit=crop' },
  ];
  
  const track = document.getElementById('gtrack');
  if (!track) return;
  
  function makeSlide(it) {
    const s = document.createElement('div');
    s.className = 'gslide';
    const im = document.createElement('img');
    im.src = it.src;
    im.alt = it.label;
    im.loading = 'lazy';
    im.decoding = 'async';
    im.onerror = () => { 
      if (it.fallback && im.src !== it.fallback) im.src = it.fallback; 
    };
    im.width = 440;
    im.height = 268;
    const lb = document.createElement('div');
    lb.className = 'label';
    lb.textContent = it.label;
    s.appendChild(im);
    s.appendChild(lb);
    return s;
  }
  
  // Add images twice for continuous loop
  [...images, ...images].forEach(it => track.appendChild(makeSlide(it)));
  
  let x = 0;
  const speed = 0.35;
  function loop() {
    x -= speed;
    const halfWidth = track.scrollWidth / 2;
    if (Math.abs(x) >= halfWidth) { x = 0; }
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  
}

/* ===================== REVIEWS MARQUEE FUNCTIONALITY ==================== */

function initReviewsMarquee() {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;
  
  // Get existing review cards and duplicate them for seamless loop
  const originalCards = Array.from(track.children);
  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    track.appendChild(clone);
  });
  
  // Adjust width to accommodate duplicated content
  track.style.width = 'calc(var(--maxw) * 2)';
  track.style.justifyContent = 'flex-start';
  
  let x = 0;
  const speed = 0.3; // Smooth scrolling speed
  
  function loop() {
    x -= speed;
    const halfWidth = track.scrollWidth / 2;
    if (Math.abs(x) >= halfWidth) { x = 0; }
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(loop);
  }
  
  requestAnimationFrame(loop);
}

/* ===================== VENDORS FUNCTIONALITY ==================== */

// Generate dynamic filter buttons from JSON data
function generateVendorFilters(vendors) {
  const filterSection = document.querySelector('.vendor-filter-section');
  if (!filterSection || !Array.isArray(vendors)) return;
  
  // Extract unique main categories from vendors data for broader filtering
  const categories = [...new Set(vendors.map(vendor => vendor.Category || vendor.cat || 'General'))].sort();
  
  // Clear existing filter buttons (keep the label)
  const existingButtons = filterSection.querySelectorAll('[data-filter]');
  existingButtons.forEach(button => button.remove());
  
  // Create "All" button first
  const allButton = document.createElement('button');
  allButton.className = 'btn btn--sm btn--secondary';
  allButton.setAttribute('data-filter', 'All');
  allButton.setAttribute('aria-pressed', 'true');
  allButton.textContent = 'All';
  filterSection.appendChild(allButton);
  
  // Create buttons for each main category
  categories.forEach(category => {
    const button = document.createElement('button');
    button.className = 'btn btn--sm btn--secondary';
    button.setAttribute('data-filter', category);
    button.setAttribute('aria-pressed', 'false');
    button.textContent = category;
    filterSection.appendChild(button);
  });
  
  // Add screen reader announcement
  const srAnnouncement = document.createElement('div');
  srAnnouncement.setAttribute('aria-live', 'polite');
  srAnnouncement.setAttribute('aria-atomic', 'true');
  srAnnouncement.className = 'sr-only';
  srAnnouncement.textContent = `Filter options loaded: ${categories.length + 1} categories available`;
  filterSection.appendChild(srAnnouncement);
}

// Setup vendor filter button functionality
function setupVendorFilters() {
  const filterButtons = document.querySelectorAll('[data-filter]');
  
  if (filterButtons.length === 0) return;
  
  // Set the first button (All) as active initially
  filterButtons[0].classList.add('active');
  filterButtons[0].setAttribute('aria-pressed', 'true');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class and update aria-pressed for all buttons
      filterButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      
      // Add active class and update aria-pressed for clicked button
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      
      // Get the filter category from the data-filter attribute
      const filterCategory = button.getAttribute('data-filter');
      
      // Render vendors with filter
      renderVendors(globalVendors, filterCategory);
      
      // Announce filter change to screen readers
      const announcement = `Showing ${filterCategory === 'All' ? 'all vendors' : filterCategory + ' vendors'}`;
      announceToScreenReader(announcement);
    });
  });
}

// Helper function to announce changes to screen readers
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
}

function makeVendorCard(vendor) {
  const div = document.createElement('div');
  div.className = 'vendor-card';
  
  // Get category-based CSS class for placeholder using the new JSON structure
  const category = vendor.Category || vendor.cat || 'General';
  const subCategory = vendor['Sub-Category'] || category;
  const vendorName = vendor['Vendor Name'] || vendor.name || 'Unknown Vendor';
  const vendorPhone = vendor['Vendor Phone'] || '';
  const referredBy = vendor['Referred By'] || '';
  const comment = vendor['Referral Comment about Vendor'] || '';
  
  const categoryClass = `vendor-logo-placeholder--${category.toLowerCase()}`;
  const placeholderClass = `vendor-logo-placeholder ${categoryClass}`;
  
  // Create phone link if phone number exists
  const phoneLink = vendorPhone ? `<a href="tel:${vendorPhone}" class="vendor-phone">${vendorPhone}</a>` : '';
  
  div.innerHTML = `
    <div class="vendor-link">
      <div class="vendor-subcategory-header">${subCategory}</div>
      <div class="${placeholderClass}">
        <!-- Placeholder without abbreviations -->
      </div>
      <div class="name">${vendorName}</div>
      ${phoneLink}
      ${referredBy ? `<div class="referred-by">Referred by: ${referredBy}</div>` : ''}
      ${comment ? `<div class="hint vendor-blurb">${comment}</div>` : ''}
    </div>
  `;
  
  return div;
}

function renderVendors(vendors, filter = 'All') {
  const grid = document.getElementById('vendorGrid');
  if (!grid || !Array.isArray(vendors)) return;
  
  // Add loading state
  grid.innerHTML = '<div class="hint" aria-live="polite">Loading vendors...</div>';
  
  // Small delay to show loading state
  setTimeout(() => {
    grid.innerHTML = '';
    // Update filter logic to use main categories for broader filtering
    const filteredVendors = vendors.filter(v => {
      const category = v.Category || v.cat || 'General';
      return filter === 'All' || 
             category === filter || 
             category.toLowerCase().includes(filter.toLowerCase());
    });
    
    if (filteredVendors.length === 0) {
      grid.innerHTML = '<div class="hint" role="status">No vendors found for this category.</div>';
      return;
    }
    
    filteredVendors.forEach(vendor => {
      const vendorCard = makeVendorCard(vendor);
      vendorCard.setAttribute('role', 'gridcell');
      grid.appendChild(vendorCard);
    });
    
    // Update grid aria-label with count
    grid.setAttribute('aria-label', `Vendor listings - ${filteredVendors.length} vendors found`);
  }, 100);
}

function renderVendorMarquee(vendors) {
  const track = document.getElementById('vendorMarquee');
  if (!track || !Array.isArray(vendors)) return;
  
  function makeLogo(vendor) {
    const s = document.createElement('div');
    s.className = 'gslide';
    s.style.width = '280px';
    s.style.height = '120px';
    
    // Extract data using new JSON structure with fallbacks
    const category = vendor.Category || vendor.cat || 'General';
    const vendorName = vendor['Vendor Name'] || vendor.name || 'Unknown Vendor';
    
    // Get category-based CSS class for marquee placeholder
    const categoryClass = `vendor-marquee-logo--${category.toLowerCase()}`;
    const placeholderClass = `vendor-marquee-logo ${categoryClass}`;
    
    const placeholder = document.createElement('div');
    placeholder.className = placeholderClass;
    placeholder.textContent = ''; // Remove abbreviations
    
    const lb = document.createElement('div');
    lb.className = 'label';
    lb.textContent = vendorName;
    
    s.appendChild(placeholder);
    s.appendChild(lb);
    return s;
  }
  
  // Add vendors twice for continuous loop
  [...vendors, ...vendors].forEach(vendor => track.appendChild(makeLogo(vendor)));
  
  let x = 0;
  const speed = 0.5;
  function loop() {
    x -= speed;
    const halfWidth = track.scrollWidth / 2;
    if (Math.abs(x) >= halfWidth) { x = 0; }
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  
}

function initVendorFilters() {
  // Initialize vendor filters after vendors are loaded
  setupVendorFilters();
}

/* ===================== DYNAMIC GALLERY ==================== */
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  // If static pre-render present, just initialize filters and announce
  if (grid.querySelector('.gallery-item')) {
    filterGallery('all');
    announceToScreenReader('Gallery ready (static)');
    console.log('AIKYAM Gallery: using static pre-render');
    return;
  }
  grid.innerHTML = '<div class="hint">Loading gallery...</div>';
  grid.setAttribute('aria-busy', 'true');
  try {
    // Use ./ prefix for consistency with other data fetches; attempt fallback if first fails
    let res;
    const primaryPath = './data/galleryImages.json';
    const altPath = '/data/galleryImages.json'; // In case site is deployed at domain root and relative path breaks
    try {
      res = await fetch(primaryPath);
    } catch (e) {
      console.warn('Gallery primary fetch threw before response:', e);
    }
    if (!res || !res.ok) {
      console.warn('Gallery primary path failed:', primaryPath, res && res.status);
      try {
        res = await fetch(altPath);
      } catch (e) {
        console.warn('Gallery alt fetch threw before response:', e);
      }
    }
    // Inline fallback: if both fetch attempts failed, try embedded JSON script tag
    if ((!res || !res.ok)) {
      const inline = document.getElementById('galleryData');
      if (inline) {
        console.warn('Gallery: using inline JSON fallback');
        const items = JSON.parse(inline.textContent || '[]');
        if (Array.isArray(items) && items.length) {
          grid.innerHTML = '';
          items.forEach(item => {
            const fig = document.createElement('figure');
            fig.className = 'gallery-item';
            fig.dataset.categories = (item.categories || []).join(',');
            fig.setAttribute('data-category', (item.categories && item.categories[0]) || 'community');
            const picture = document.createElement('picture');
            const source = document.createElement('source');
            source.type = 'image/webp';
            source.sizes = '(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 300px';
            source.srcset = (item.srcsetWebp || []).join(', ');
            const img = document.createElement('img');
            img.src = item.imageJpeg;
            img.alt = item.alt || item.caption || 'Gallery image';
            img.loading = 'lazy';
            img.decoding = 'async';
            picture.appendChild(source);
            picture.appendChild(img);
            const cap = document.createElement('figcaption');
            cap.textContent = item.caption || item.alt || 'Untitled';
            fig.appendChild(picture);
            fig.appendChild(cap);
            grid.appendChild(fig);
          });
          grid.removeAttribute('aria-busy');
          announceToScreenReader(`Gallery loaded: ${items.length} images (inline)`);
          filterGallery('all');
          return;
        }
      }
    }
    if (!res || !res.ok) throw new Error('Gallery manifest fetch failed (tried: ' + primaryPath + (primaryPath !== altPath ? ', ' + altPath : '') + ')');
    const items = await res.json();
    if (!Array.isArray(items)) throw new Error('Invalid gallery manifest');
    grid.innerHTML = '';
    items.forEach(item => {
      const fig = document.createElement('figure');
      fig.className = 'gallery-item';
      fig.dataset.categories = (item.categories || []).join(',');
      fig.setAttribute('data-category', (item.categories && item.categories[0]) || 'community');
      const picture = document.createElement('picture');
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.sizes = '(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 300px';
      source.srcset = (item.srcsetWebp || []).join(', ');
      const img = document.createElement('img');
      img.src = item.imageJpeg;
      img.alt = item.alt || item.caption || 'Gallery image';
      img.loading = 'lazy';
      img.decoding = 'async';
      if (item.width) img.width = item.width;
      if (item.height) img.height = item.height;
      img.fetchPriority = 'low';
      img.addEventListener('error', () => {
        console.warn('Gallery image failed:', img.src);
        // Basic placeholder if image missing
        const ph = document.createElement('div');
        ph.style.cssText = 'width:100%;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ffcc00,#ff9900);font-weight:700;font-size:14px;color:#000;';
        ph.textContent = (item.caption || 'Image').slice(0,40);
        img.replaceWith(ph);
      }, { once: true });
      picture.appendChild(source);
      picture.appendChild(img);
      const cap = document.createElement('figcaption');
      cap.textContent = item.caption || item.alt || 'Untitled';
      fig.appendChild(picture);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
    grid.removeAttribute('aria-busy');
    announceToScreenReader(`Gallery loaded: ${items.length} images`);
    console.log('AIKYAM Gallery: loaded', items.length, 'items');
    // Ensure "All" filter active visually
    filterGallery('all');
  } catch (err) {
    console.error('Gallery load error', err);
    grid.innerHTML = '<div class="hint">Failed to load gallery.</div>';
    grid.removeAttribute('aria-busy');
    grid.setAttribute('data-gallery-error', err.message || 'unknown');
  }
}

function filterGallery(category) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const figs = Array.from(grid.querySelectorAll('.gallery-item'));
  const target = category.toLowerCase();
  let visibleCount = 0;
  figs.forEach(f => {
    if (target === 'all') {
      f.style.display = '';
      visibleCount++;
    } else {
      const cats = (f.dataset.categories || '').toLowerCase().split(',').filter(Boolean);
      const show = cats.includes(target);
      f.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    }
  });
  // Remove prior empty state
  const oldEmpty = grid.querySelector('.gallery-empty');
  if (oldEmpty) oldEmpty.remove();
  if (visibleCount === 0) {
    const empty = document.createElement('div');
    empty.className = 'gallery-empty hint';
    empty.textContent = `No images yet for "${category}" – coming soon.`;
    grid.appendChild(empty);
  }
  // Button active state
  document.querySelectorAll('.gallery-category-buttons .btn').forEach(btn => {
    const text = btn.textContent.toLowerCase();
    const isAll = target === 'all' && text.includes('all');
    const matches = text.includes(target);
    btn.classList.toggle('active', isAll || matches);
  });
  if (window.showToast) {
    showToast(`Showing ${target === 'all' ? 'all' : target} moments (${visibleCount})`);
  }
  announceToScreenReader(`Filtered gallery: ${target} moments (${visibleCount} shown)`);
}


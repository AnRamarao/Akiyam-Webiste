/*
  AIKYAM — Admin Registrations Page Logic
  - Auth-gated registration list
  - Filter by event, view details
  - Role-aware actions (confirm, delete)
*/

(function () {
  'use strict';

  var currentFilter = 'all';
  var allRegistrations = [];
  var canManage = false;
  var canDelete = false;

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.AIKYAM_Auth || !window.AIKYAM_Registration) return;

    var allowed = await AIKYAM_Auth.requireAuth('ProgramManager');
    if (!allowed) return;

    var profile = await AIKYAM_Auth.getProfile();
    if (profile) {
      canManage = AIKYAM_Auth.hasMinRole(profile.role, 'ContentManager');
      canDelete = AIKYAM_Auth.isAdmin(profile.role);
    }

    await loadRegistrations();
  });

  /* ===================== DATA LOADING ===================== */
  async function loadRegistrations() {
    var container = document.getElementById('registrationsList');
    container.innerHTML = '<div class="admin-list__empty">Loading registrations...</div>';

    allRegistrations = await AIKYAM_Registration.fetchAllRegistrations();
    buildEventTabs(allRegistrations);
    renderList(filterByEvent(allRegistrations, currentFilter));
    updateCount(allRegistrations.length);
  }

  function filterByEvent(regs, eventId) {
    if (eventId === 'all') return regs;
    return regs.filter(function (r) { return r.event_id === eventId; });
  }

  function updateCount(count) {
    var el = document.getElementById('regCount');
    if (el) el.textContent = count + ' registration' + (count !== 1 ? 's' : '');
  }

  /* ===================== DYNAMIC TABS ===================== */
  function buildEventTabs(regs) {
    var events = {};
    regs.forEach(function (r) {
      if (r.events && r.events.title && !events[r.event_id]) {
        events[r.event_id] = r.events.title;
      }
    });

    var tabs = document.getElementById('eventTabs');
    var activeFilter = currentFilter;
    tabs.innerHTML = '<button class="admin-tabs__tab' + (activeFilter === 'all' ? ' admin-tabs__tab--active' : '') + '" data-event="all">All Events</button>'
      + Object.keys(events).map(function (id) {
        var active = activeFilter === id ? ' admin-tabs__tab--active' : '';
        return '<button class="admin-tabs__tab' + active + '" data-event="' + id + '">' + escapeHTML(events[id]) + '</button>';
      }).join('');

    bindTabs();
  }

  /* ===================== LIST RENDERING ===================== */
  function renderList(regs) {
    var container = document.getElementById('registrationsList');
    updateCount(regs.length);

    if (!regs.length) {
      container.innerHTML = '<div class="admin-list__empty">No registrations found.</div>';
      return;
    }

    container.innerHTML = regs.map(function (r) {
      var eventTitle = (r.events && r.events.title) || 'Unknown Event';
      var dateStr = r.created_at
        ? new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
        : '';
      var confirmedBadge = r.confirmed
        ? '<span class="pill pill--sm admin-list__status--published">Confirmed</span>'
        : '<span class="pill pill--sm admin-list__status--draft">Pending</span>';
      var guestStr = r.guests > 1 ? ' (' + r.guests + ' guests)' : '';

      var actions = buildActions(r);

      return '<div class="admin-list__item" data-id="' + r.id + '">'
        + '<div class="admin-list__item-main">'
        + '<span class="admin-list__title">' + escapeHTML(r.full_name) + guestStr + '</span>'
        + '<span class="admin-list__date">' + escapeHTML(r.email) + (r.phone ? ' &middot; ' + escapeHTML(r.phone) : '') + '</span>'
        + '<span class="pill pill--sm admin-list__status--expired">' + escapeHTML(eventTitle) + '</span>'
        + confirmedBadge
        + '<span class="admin-list__date">' + dateStr + '</span>'
        + (r.notes ? '<span class="admin-list__date" style="font-style:italic;">' + escapeHTML(r.notes) + '</span>' : '')
        + '</div>'
        + '<div class="admin-list__actions">' + actions + '</div>'
        + '</div>';
    }).join('');

    container.onclick = handleListAction;
  }

  function buildActions(r) {
    var html = '';

    if (canManage) {
      if (!r.confirmed) {
        html += '<button class="btn mini btn--primary" data-action="confirm" data-id="' + r.id + '">Confirm</button>';
      } else {
        html += '<button class="btn mini btn--danger" data-action="unconfirm" data-id="' + r.id + '">Unconfirm</button>';
      }
    }

    if (canDelete) {
      html += '<button class="btn mini btn--danger-outline" data-action="delete" data-id="' + r.id + '">Delete</button>';
    }

    return html;
  }

  /* ===================== ACTIONS ===================== */
  async function handleListAction(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    var action = btn.dataset.action;
    var id = btn.dataset.id;
    var result;

    if (action === 'confirm') {
      result = await AIKYAM_Registration.updateRegistration(id, { confirmed: true });
    } else if (action === 'unconfirm') {
      result = await AIKYAM_Registration.updateRegistration(id, { confirmed: false });
    } else if (action === 'delete') {
      if (!confirm('Delete this registration? This cannot be undone.')) return;
      result = await AIKYAM_Registration.deleteRegistration(id);
    }

    if (result && result.error) {
      alert(result.error.message);
    } else {
      await loadRegistrations();
    }
  }

  /* ===================== TABS ===================== */
  function bindTabs() {
    var tabs = document.getElementById('eventTabs');
    if (!tabs) return;

    var clone = tabs.cloneNode(true);
    tabs.parentNode.replaceChild(clone, tabs);

    clone.addEventListener('click', function (e) {
      var tab = e.target.closest('.admin-tabs__tab');
      if (!tab) return;

      clone.querySelectorAll('.admin-tabs__tab').forEach(function (t) {
        t.classList.remove('admin-tabs__tab--active');
      });
      tab.classList.add('admin-tabs__tab--active');

      currentFilter = tab.dataset.event;
      renderList(filterByEvent(allRegistrations, currentFilter));
    });
  }

  /* ===================== HELPERS ===================== */
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();

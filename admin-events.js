/*
  AIKYAM — Admin Events Page Logic
  - Auth-gated event management UI
  - List rendering, filtering, form handling
  - Role-aware action buttons
*/

(function () {
  'use strict';

  var currentFilter = 'all';
  var editingEventId = null;
  var allEvents = [];
  var canPublish = false;
  var canDelete = false;

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', async function () {
    // Wait for auth to be ready
    if (!window.AIKYAM_Auth || !window.AIKYAM_Events) return;

    // Auth gate: ProgramManager+ required
    var allowed = await AIKYAM_Auth.requireAuth('ProgramManager');
    if (!allowed) return;

    // Determine capabilities based on role
    var profile = await AIKYAM_Auth.getProfile();
    if (profile) {
      canPublish = AIKYAM_Auth.hasMinRole(profile.role, 'ContentManager');
      canDelete = AIKYAM_Auth.isAdmin(profile.role);
    }

    bindTabs();
    bindCreateButton();
    bindFormEvents();
    bindModalClose();

    await loadEventsList();
  });

  /* ===================== DATA LOADING ===================== */
  async function loadEventsList() {
    var container = document.getElementById('eventsList');
    container.innerHTML = '<div class="admin-list__empty">Loading events...</div>';

    allEvents = await AIKYAM_Events.fetchAllEvents();
    renderList(filterByStatus(allEvents, currentFilter));
  }

  function filterByStatus(events, status) {
    if (status === 'all') return events;
    return events.filter(function (e) { return e.status === status; });
  }

  /* ===================== LIST RENDERING ===================== */
  function renderList(events) {
    var container = document.getElementById('eventsList');

    if (!events.length) {
      container.innerHTML = '<div class="admin-list__empty">No events found.</div>';
      return;
    }

    container.innerHTML = events.map(function (evt) {
      var dateStr = evt.start_at
        ? new Date(evt.start_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : 'No date';

      var scheduledStr = evt.publish_at
        ? '<span class="admin-list__scheduled">Scheduled: ' + new Date(evt.publish_at).toLocaleString() + '</span>'
        : '';

      var actions = buildActions(evt);

      return '<div class="admin-list__item" data-id="' + evt.id + '">'
        + '<div class="admin-list__item-main">'
        + '<span class="admin-list__title">' + escapeHTML(evt.title) + '</span>'
        + '<span class="pill pill--sm admin-list__status--' + evt.status + '">' + evt.status + '</span>'
        + '<span class="admin-list__date">' + dateStr + '</span>'
        + scheduledStr
        + '</div>'
        + '<div class="admin-list__actions">' + actions + '</div>'
        + '</div>';
    }).join('');

    // Event delegation for action buttons
    container.onclick = handleListAction;
  }

  function buildActions(evt) {
    var html = '<button class="btn mini secondary" data-action="edit" data-id="' + evt.id + '">Edit</button>';

    if (canPublish) {
      if (evt.status === 'draft' || evt.status === 'deactivated') {
        html += '<button class="btn mini btn--primary" data-action="publish" data-id="' + evt.id + '">Publish</button>';
      }
      if (evt.status === 'published') {
        html += '<button class="btn mini btn--danger" data-action="deactivate" data-id="' + evt.id + '">Deactivate</button>';
      }
    }

    if (canDelete) {
      html += '<button class="btn mini btn--danger-outline" data-action="delete" data-id="' + evt.id + '">Delete</button>';
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

    if (action === 'edit') {
      openEditModal(id);
      return;
    }

    if (action === 'publish') {
      result = await AIKYAM_Events.publishEvent(id);
    } else if (action === 'deactivate') {
      if (!confirm('Deactivate this event? It will be hidden from the public site.')) return;
      result = await AIKYAM_Events.deactivateEvent(id);
    } else if (action === 'delete') {
      if (!confirm('Permanently delete this event? This cannot be undone.')) return;
      result = await AIKYAM_Events.deleteEvent(id);
    }

    if (result && result.error) {
      alert(result.error.message);
    } else {
      await loadEventsList();
    }
  }

  /* ===================== TABS ===================== */
  function bindTabs() {
    var tabs = document.getElementById('statusTabs');
    if (!tabs) return;

    tabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.admin-tabs__tab');
      if (!tab) return;

      tabs.querySelectorAll('.admin-tabs__tab').forEach(function (t) {
        t.classList.remove('admin-tabs__tab--active');
      });
      tab.classList.add('admin-tabs__tab--active');

      currentFilter = tab.dataset.status;
      renderList(filterByStatus(allEvents, currentFilter));
    });
  }

  /* ===================== MODAL ===================== */
  function showModal() {
    document.getElementById('eventModal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    document.getElementById('eventModal').style.display = 'none';
    document.body.style.overflow = '';
    editingEventId = null;
    clearFormMessage();
  }

  function bindModalClose() {
    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('modalBackdrop').addEventListener('click', hideModal);
    document.getElementById('formCancelBtn').addEventListener('click', hideModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('eventModal').style.display !== 'none') {
        hideModal();
      }
    });
  }

  /* ===================== CREATE / EDIT ===================== */
  function bindCreateButton() {
    var btn = document.getElementById('createEventBtn');
    if (btn) btn.addEventListener('click', openCreateModal);
  }

  function openCreateModal() {
    editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Create Event';
    document.getElementById('formSubmitBtn').textContent = 'Save as Draft';
    document.getElementById('eventForm').reset();
    document.getElementById('evtImg').value = 'assets/branding/logo.png';
    document.getElementById('evtLocation').value = 'TBD';
    document.getElementById('evtPrice').value = '0';
    showModal();
  }

  function openEditModal(id) {
    var evt = allEvents.find(function (e) { return e.id === id; });
    if (!evt) return;

    editingEventId = id;
    document.getElementById('modalTitle').textContent = 'Edit Event';
    document.getElementById('formSubmitBtn').textContent = 'Save Changes';

    document.getElementById('evtTitle').value = evt.title || '';
    document.getElementById('evtDesc').value = evt.description || '';
    document.getElementById('evtStart').value = toLocalDatetime(evt.start_at);
    document.getElementById('evtEnd').value = toLocalDatetime(evt.end_at);
    document.getElementById('evtLocation').value = evt.location || 'TBD';
    document.getElementById('evtPrice').value = evt.price || 0;
    document.getElementById('evtImg').value = evt.img || 'assets/branding/logo.png';
    document.getElementById('evtSummary').value = evt.summary || '';
    document.getElementById('evtTbd').checked = evt.tbd || false;
    document.getElementById('evtPublishAt').value = toLocalDatetime(evt.publish_at);

    showModal();
  }

  /* ===================== FORM SUBMIT ===================== */
  function bindFormEvents() {
    document.getElementById('eventForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = collectFormData();
      var msg = document.getElementById('formMessage');

      if (!data.title.trim()) {
        showFormMessage(msg, 'Title is required.', 'error');
        return;
      }

      showFormMessage(msg, 'Saving...', 'info');

      var result;
      if (editingEventId) {
        result = await AIKYAM_Events.updateEvent(editingEventId, data);
      } else {
        result = await AIKYAM_Events.createEvent(data);
      }

      if (result.error) {
        showFormMessage(msg, result.error.message, 'error');
      } else {
        hideModal();
        await loadEventsList();
      }
    });
  }

  function collectFormData() {
    return {
      title: document.getElementById('evtTitle').value.trim(),
      description: document.getElementById('evtDesc').value.trim(),
      start_at: document.getElementById('evtStart').value || null,
      end_at: document.getElementById('evtEnd').value || null,
      location: document.getElementById('evtLocation').value.trim() || 'TBD',
      price: parseFloat(document.getElementById('evtPrice').value) || 0,
      img: document.getElementById('evtImg').value.trim() || 'assets/branding/logo.png',
      summary: document.getElementById('evtSummary').value.trim(),
      tbd: document.getElementById('evtTbd').checked,
      publish_at: document.getElementById('evtPublishAt').value || null
    };
  }

  /* ===================== HELPERS ===================== */
  function toLocalDatetime(isoString) {
    if (!isoString) return '';
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function showFormMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'admin-form__message admin-form__message--' + type;
  }

  function clearFormMessage() {
    var msg = document.getElementById('formMessage');
    if (msg) { msg.textContent = ''; msg.className = 'admin-form__message'; }
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();

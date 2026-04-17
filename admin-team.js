/*
  AIKYAM — Admin Team Page Logic
  - Auth-gated team member management UI
  - List rendering, group filtering, form handling
  - Role-aware action buttons
*/

(function () {
  'use strict';

  var currentFilter = 'all';
  var editingMemberId = null;
  var allMembers = [];
  var canManage = false;
  var canDelete = false;

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.AIKYAM_Auth || !window.AIKYAM_Team) return;

    var allowed = await AIKYAM_Auth.requireAuth('ProgramManager');
    if (!allowed) return;

    var profile = await AIKYAM_Auth.getProfile();
    if (profile) {
      canManage = AIKYAM_Auth.hasMinRole(profile.role, 'ContentManager');
      canDelete = AIKYAM_Auth.isAdmin(profile.role);
    }

    bindTabs();
    bindCreateButton();
    bindFormEvents();
    bindModalClose();

    await loadMembersList();
  });

  /* ===================== DATA LOADING ===================== */
  async function loadMembersList() {
    var container = document.getElementById('membersList');
    container.innerHTML = '<div class="admin-list__empty">Loading team members...</div>';

    allMembers = await AIKYAM_Team.fetchAllMembers();
    renderList(filterByGroup(allMembers, currentFilter));
  }

  function filterByGroup(members, group) {
    if (group === 'all') return members;
    return members.filter(function (m) { return m.team_group === group; });
  }

  /* ===================== LIST RENDERING ===================== */
  function renderList(members) {
    var container = document.getElementById('membersList');

    if (!members.length) {
      container.innerHTML = '<div class="admin-list__empty">No team members found.</div>';
      return;
    }

    container.innerHTML = members.map(function (m) {
      var groupLabel = m.team_group === 'board' ? 'Board' : 'Executive';
      var yearStr = m.year ? ' (' + m.year + ')' : '';
      var chairmanBadge = m.is_chairman ? ' <span class="pill pill--sm admin-list__status--published">Chairman</span>' : '';
      var activeBadge = m.active
        ? '<span class="pill pill--sm admin-list__status--published">Active</span>'
        : '<span class="pill pill--sm admin-list__status--deactivated">Inactive</span>';

      var actions = buildActions(m);

      return '<div class="admin-list__item" data-id="' + m.id + '">'
        + '<div class="admin-list__item-main">'
        + '<span class="admin-list__title">' + escapeHTML(m.name) + '</span>'
        + '<span class="admin-list__date">' + escapeHTML(m.title) + '</span>'
        + '<span class="pill pill--sm admin-list__status--draft">' + groupLabel + yearStr + '</span>'
        + chairmanBadge
        + activeBadge
        + '</div>'
        + '<div class="admin-list__actions">' + actions + '</div>'
        + '</div>';
    }).join('');

    container.onclick = handleListAction;
  }

  function buildActions(m) {
    var html = '<button class="btn mini secondary" data-action="edit" data-id="' + m.id + '">Edit</button>';

    if (canManage) {
      if (m.active) {
        html += '<button class="btn mini btn--danger" data-action="deactivate" data-id="' + m.id + '">Deactivate</button>';
      } else {
        html += '<button class="btn mini btn--primary" data-action="activate" data-id="' + m.id + '">Activate</button>';
      }
    }

    if (canDelete) {
      html += '<button class="btn mini btn--danger-outline" data-action="delete" data-id="' + m.id + '">Delete</button>';
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

    if (action === 'activate') {
      result = await AIKYAM_Team.updateMember(id, { active: true });
    } else if (action === 'deactivate') {
      if (!confirm('Deactivate this member? They will be hidden from the public site.')) return;
      result = await AIKYAM_Team.updateMember(id, { active: false });
    } else if (action === 'delete') {
      if (!confirm('Permanently delete this member? This cannot be undone.')) return;
      result = await AIKYAM_Team.deleteMember(id);
    }

    if (result && result.error) {
      alert(result.error.message);
    } else {
      await loadMembersList();
    }
  }

  /* ===================== TABS ===================== */
  function bindTabs() {
    var tabs = document.getElementById('groupTabs');
    if (!tabs) return;

    tabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.admin-tabs__tab');
      if (!tab) return;

      tabs.querySelectorAll('.admin-tabs__tab').forEach(function (t) {
        t.classList.remove('admin-tabs__tab--active');
      });
      tab.classList.add('admin-tabs__tab--active');

      currentFilter = tab.dataset.group;
      renderList(filterByGroup(allMembers, currentFilter));
    });
  }

  /* ===================== MODAL ===================== */
  function showModal() {
    document.getElementById('memberModal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    document.getElementById('memberModal').style.display = 'none';
    document.body.style.overflow = '';
    editingMemberId = null;
    clearFormMessage();
  }

  function bindModalClose() {
    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('modalBackdrop').addEventListener('click', hideModal);
    document.getElementById('formCancelBtn').addEventListener('click', hideModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('memberModal').style.display !== 'none') {
        hideModal();
      }
    });
  }

  /* ===================== CREATE / EDIT ===================== */
  function bindCreateButton() {
    var btn = document.getElementById('createMemberBtn');
    if (btn) btn.addEventListener('click', openCreateModal);
  }

  function openCreateModal() {
    editingMemberId = null;
    document.getElementById('modalTitle').textContent = 'Add Member';
    document.getElementById('formSubmitBtn').textContent = 'Save';
    document.getElementById('memberForm').reset();
    document.getElementById('memImg').value = 'assets/branding/logo.png';
    document.getElementById('memOrder').value = '0';
    document.getElementById('memActive').checked = true;
    showModal();
  }

  function openEditModal(id) {
    var m = allMembers.find(function (item) { return item.id === id; });
    if (!m) return;

    editingMemberId = id;
    document.getElementById('modalTitle').textContent = 'Edit Member';
    document.getElementById('formSubmitBtn').textContent = 'Save Changes';

    document.getElementById('memName').value = m.name || '';
    document.getElementById('memTitle').value = m.title || '';
    document.getElementById('memImg').value = m.img || 'assets/branding/logo.png';
    document.getElementById('memGroup').value = m.team_group || 'executive';
    document.getElementById('memYear').value = m.year || '';
    document.getElementById('memOrder').value = m.sort_order || 0;
    document.getElementById('memChairman').checked = m.is_chairman || false;
    document.getElementById('memActive').checked = m.active !== false;

    showModal();
  }

  /* ===================== FORM SUBMIT ===================== */
  function bindFormEvents() {
    document.getElementById('memberForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = collectFormData();
      var msg = document.getElementById('formMessage');

      if (!data.name.trim()) {
        showFormMessage(msg, 'Name is required.', 'error');
        return;
      }
      if (!data.title.trim()) {
        showFormMessage(msg, 'Title / Role is required.', 'error');
        return;
      }

      showFormMessage(msg, 'Saving...', 'info');

      var result;
      if (editingMemberId) {
        result = await AIKYAM_Team.updateMember(editingMemberId, data);
      } else {
        result = await AIKYAM_Team.createMember(data);
      }

      if (result.error) {
        showFormMessage(msg, result.error.message, 'error');
      } else {
        hideModal();
        await loadMembersList();
      }
    });
  }

  function collectFormData() {
    var yearVal = document.getElementById('memYear').value;
    return {
      name: document.getElementById('memName').value.trim(),
      title: document.getElementById('memTitle').value.trim(),
      img: document.getElementById('memImg').value.trim() || 'assets/branding/logo.png',
      team_group: document.getElementById('memGroup').value,
      year: yearVal ? parseInt(yearVal, 10) : null,
      is_chairman: document.getElementById('memChairman').checked,
      sort_order: parseInt(document.getElementById('memOrder').value, 10) || 0,
      active: document.getElementById('memActive').checked
    };
  }

  /* ===================== HELPERS ===================== */
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
    div.textContent = str || '';
    return div.innerHTML;
  }
})();

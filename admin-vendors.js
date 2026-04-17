/*
  AIKYAM — Admin Vendors Page Logic
  - Auth-gated vendor directory management UI
  - List rendering, category filtering, form handling
  - Role-aware action buttons
*/

(function () {
  'use strict';

  var currentFilter = 'all';
  var editingVendorId = null;
  var allVendors = [];
  var canManage = false;
  var canDelete = false;

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.AIKYAM_Auth || !window.AIKYAM_Vendors) return;

    var allowed = await AIKYAM_Auth.requireAuth('ProgramManager');
    if (!allowed) return;

    var profile = await AIKYAM_Auth.getProfile();
    if (profile) {
      canManage = AIKYAM_Auth.hasMinRole(profile.role, 'ContentManager');
      canDelete = AIKYAM_Auth.isAdmin(profile.role);
    }

    bindCreateButton();
    bindFormEvents();
    bindModalClose();

    await loadVendorsList();
  });

  /* ===================== DATA LOADING ===================== */
  async function loadVendorsList() {
    var container = document.getElementById('vendorsList');
    container.innerHTML = '<div class="admin-list__empty">Loading vendors...</div>';

    allVendors = await AIKYAM_Vendors.fetchAllVendors();
    buildCategoryTabs(allVendors);
    renderList(filterByCategory(allVendors, currentFilter));
  }

  function filterByCategory(vendors, category) {
    if (category === 'all') return vendors;
    return vendors.filter(function (v) { return v.category === category; });
  }

  /* ===================== DYNAMIC TABS ===================== */
  function buildCategoryTabs(vendors) {
    var categories = [];
    vendors.forEach(function (v) {
      if (v.category && categories.indexOf(v.category) === -1) {
        categories.push(v.category);
      }
    });
    categories.sort();

    var tabs = document.getElementById('categoryTabs');
    // Keep "All" tab, add category tabs
    tabs.innerHTML = '<button class="admin-tabs__tab admin-tabs__tab--active" data-category="all">All</button>'
      + categories.map(function (cat) {
        return '<button class="admin-tabs__tab" data-category="' + escapeHTML(cat) + '">' + escapeHTML(cat) + '</button>';
      }).join('');

    bindTabs();
  }

  /* ===================== LIST RENDERING ===================== */
  function renderList(vendors) {
    var container = document.getElementById('vendorsList');

    if (!vendors.length) {
      container.innerHTML = '<div class="admin-list__empty">No vendors found.</div>';
      return;
    }

    container.innerHTML = vendors.map(function (v) {
      var subCat = v.sub_category ? ' / ' + escapeHTML(v.sub_category) : '';
      var phone = v.vendor_phone ? ' &middot; ' + escapeHTML(v.vendor_phone) : '';
      var activeBadge = v.active
        ? '<span class="pill pill--sm admin-list__status--published">Active</span>'
        : '<span class="pill pill--sm admin-list__status--deactivated">Inactive</span>';

      var actions = buildActions(v);

      return '<div class="admin-list__item" data-id="' + v.id + '">'
        + '<div class="admin-list__item-main">'
        + '<span class="admin-list__title">' + escapeHTML(v.vendor_name) + '</span>'
        + '<span class="pill pill--sm admin-list__status--draft">' + escapeHTML(v.category) + subCat + '</span>'
        + '<span class="admin-list__date">' + phone + '</span>'
        + activeBadge
        + '</div>'
        + '<div class="admin-list__actions">' + actions + '</div>'
        + '</div>';
    }).join('');

    container.onclick = handleListAction;
  }

  function buildActions(v) {
    var html = '<button class="btn mini secondary" data-action="edit" data-id="' + v.id + '">Edit</button>';

    if (canManage) {
      if (v.active) {
        html += '<button class="btn mini btn--danger" data-action="deactivate" data-id="' + v.id + '">Deactivate</button>';
      } else {
        html += '<button class="btn mini btn--primary" data-action="activate" data-id="' + v.id + '">Activate</button>';
      }
    }

    if (canDelete) {
      html += '<button class="btn mini btn--danger-outline" data-action="delete" data-id="' + v.id + '">Delete</button>';
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
      result = await AIKYAM_Vendors.updateVendor(id, { active: true });
    } else if (action === 'deactivate') {
      if (!confirm('Deactivate this vendor? They will be hidden from the public site.')) return;
      result = await AIKYAM_Vendors.updateVendor(id, { active: false });
    } else if (action === 'delete') {
      if (!confirm('Permanently delete this vendor? This cannot be undone.')) return;
      result = await AIKYAM_Vendors.deleteVendor(id);
    }

    if (result && result.error) {
      alert(result.error.message);
    } else {
      await loadVendorsList();
    }
  }

  /* ===================== TABS ===================== */
  function bindTabs() {
    var tabs = document.getElementById('categoryTabs');
    if (!tabs) return;

    // Remove old listener by replacing
    var clone = tabs.cloneNode(true);
    tabs.parentNode.replaceChild(clone, tabs);

    clone.addEventListener('click', function (e) {
      var tab = e.target.closest('.admin-tabs__tab');
      if (!tab) return;

      clone.querySelectorAll('.admin-tabs__tab').forEach(function (t) {
        t.classList.remove('admin-tabs__tab--active');
      });
      tab.classList.add('admin-tabs__tab--active');

      currentFilter = tab.dataset.category;
      renderList(filterByCategory(allVendors, currentFilter));
    });
  }

  /* ===================== MODAL ===================== */
  function showModal() {
    document.getElementById('vendorModal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    document.getElementById('vendorModal').style.display = 'none';
    document.body.style.overflow = '';
    editingVendorId = null;
    clearFormMessage();
  }

  function bindModalClose() {
    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('modalBackdrop').addEventListener('click', hideModal);
    document.getElementById('formCancelBtn').addEventListener('click', hideModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('vendorModal').style.display !== 'none') {
        hideModal();
      }
    });
  }

  /* ===================== CREATE / EDIT ===================== */
  function bindCreateButton() {
    var btn = document.getElementById('createVendorBtn');
    if (btn) btn.addEventListener('click', openCreateModal);
  }

  function openCreateModal() {
    editingVendorId = null;
    document.getElementById('modalTitle').textContent = 'Add Vendor';
    document.getElementById('formSubmitBtn').textContent = 'Save';
    document.getElementById('vendorForm').reset();
    document.getElementById('vndOrder').value = '0';
    document.getElementById('vndActive').checked = true;
    showModal();
  }

  function openEditModal(id) {
    var v = allVendors.find(function (item) { return item.id === id; });
    if (!v) return;

    editingVendorId = id;
    document.getElementById('modalTitle').textContent = 'Edit Vendor';
    document.getElementById('formSubmitBtn').textContent = 'Save Changes';

    document.getElementById('vndCategory').value = v.category || '';
    document.getElementById('vndSubCategory').value = v.sub_category || '';
    document.getElementById('vndName').value = v.vendor_name || '';
    document.getElementById('vndPhone').value = v.vendor_phone || '';
    document.getElementById('vndReferredBy').value = v.referred_by || '';
    document.getElementById('vndComment').value = v.comment || '';
    document.getElementById('vndOrder').value = v.sort_order || 0;
    document.getElementById('vndActive').checked = v.active !== false;

    showModal();
  }

  /* ===================== FORM SUBMIT ===================== */
  function bindFormEvents() {
    document.getElementById('vendorForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = collectFormData();
      var msg = document.getElementById('formMessage');

      if (!data.category.trim()) {
        showFormMessage(msg, 'Category is required.', 'error');
        return;
      }
      if (!data.vendor_name.trim()) {
        showFormMessage(msg, 'Vendor name is required.', 'error');
        return;
      }

      showFormMessage(msg, 'Saving...', 'info');

      var result;
      if (editingVendorId) {
        result = await AIKYAM_Vendors.updateVendor(editingVendorId, data);
      } else {
        result = await AIKYAM_Vendors.createVendor(data);
      }

      if (result.error) {
        showFormMessage(msg, result.error.message, 'error');
      } else {
        hideModal();
        await loadVendorsList();
      }
    });
  }

  function collectFormData() {
    return {
      category: document.getElementById('vndCategory').value.trim(),
      sub_category: document.getElementById('vndSubCategory').value.trim(),
      vendor_name: document.getElementById('vndName').value.trim(),
      vendor_phone: document.getElementById('vndPhone').value.trim(),
      referred_by: document.getElementById('vndReferredBy').value.trim(),
      comment: document.getElementById('vndComment').value.trim(),
      sort_order: parseInt(document.getElementById('vndOrder').value, 10) || 0,
      active: document.getElementById('vndActive').checked
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

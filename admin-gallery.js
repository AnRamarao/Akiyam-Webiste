/*
  AIKYAM — Admin Gallery Page Logic
  - Auth-gated gallery image management UI
  - List rendering, category filtering, form handling
  - Role-aware action buttons
*/

(function () {
  'use strict';

  var currentFilter = 'all';
  var editingImageId = null;
  var allImages = [];
  var canManage = false;
  var canDelete = false;

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.AIKYAM_Auth || !window.AIKYAM_Gallery) return;

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

    await loadImagesList();
  });

  /* ===================== DATA LOADING ===================== */
  async function loadImagesList() {
    var container = document.getElementById('imagesList');
    container.innerHTML = '<div class="admin-list__empty">Loading gallery images...</div>';

    allImages = await AIKYAM_Gallery.fetchAllImages();
    buildCategoryTabs(allImages);
    renderList(filterByCategory(allImages, currentFilter));
  }

  function filterByCategory(images, category) {
    if (category === 'all') return images;
    return images.filter(function (img) {
      return img.categories && img.categories.indexOf(category) !== -1;
    });
  }

  /* ===================== DYNAMIC TABS ===================== */
  function buildCategoryTabs(images) {
    var categories = [];
    images.forEach(function (img) {
      if (img.categories) {
        img.categories.forEach(function (cat) {
          if (categories.indexOf(cat) === -1) categories.push(cat);
        });
      }
    });
    categories.sort();

    var tabs = document.getElementById('categoryTabs');
    tabs.innerHTML = '<button class="admin-tabs__tab admin-tabs__tab--active" data-category="all">All</button>'
      + categories.map(function (cat) {
        return '<button class="admin-tabs__tab" data-category="' + escapeHTML(cat) + '">' + escapeHTML(cat) + '</button>';
      }).join('');

    bindTabs();
  }

  /* ===================== LIST RENDERING ===================== */
  function renderList(images) {
    var container = document.getElementById('imagesList');

    if (!images.length) {
      container.innerHTML = '<div class="admin-list__empty">No gallery images found.</div>';
      return;
    }

    container.innerHTML = images.map(function (img) {
      var cats = (img.categories || []).join(', ');
      var dims = (img.width && img.height) ? img.width + '×' + img.height : '';
      var activeBadge = img.active
        ? '<span class="pill pill--sm admin-list__status--published">Active</span>'
        : '<span class="pill pill--sm admin-list__status--deactivated">Inactive</span>';

      var actions = buildActions(img);

      return '<div class="admin-list__item" data-id="' + img.id + '">'
        + '<div class="admin-list__item-main">'
        + '<span class="admin-list__title">' + escapeHTML(img.file_base) + '</span>'
        + '<span class="admin-list__date">' + escapeHTML(img.alt || '') + '</span>'
        + (cats ? '<span class="pill pill--sm admin-list__status--draft">' + escapeHTML(cats) + '</span>' : '')
        + (dims ? '<span class="admin-list__date">' + dims + '</span>' : '')
        + activeBadge
        + '</div>'
        + '<div class="admin-list__actions">' + actions + '</div>'
        + '</div>';
    }).join('');

    container.onclick = handleListAction;
  }

  function buildActions(img) {
    var html = '<button class="btn mini secondary" data-action="edit" data-id="' + img.id + '">Edit</button>';

    if (canManage) {
      if (img.active) {
        html += '<button class="btn mini btn--danger" data-action="deactivate" data-id="' + img.id + '">Deactivate</button>';
      } else {
        html += '<button class="btn mini btn--primary" data-action="activate" data-id="' + img.id + '">Activate</button>';
      }
    }

    if (canDelete) {
      html += '<button class="btn mini btn--danger-outline" data-action="delete" data-id="' + img.id + '">Delete</button>';
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
      result = await AIKYAM_Gallery.updateImage(id, { active: true });
    } else if (action === 'deactivate') {
      if (!confirm('Deactivate this image? It will be hidden from the public gallery.')) return;
      result = await AIKYAM_Gallery.updateImage(id, { active: false });
    } else if (action === 'delete') {
      if (!confirm('Permanently delete this image? This cannot be undone.')) return;
      result = await AIKYAM_Gallery.deleteImage(id);
    }

    if (result && result.error) {
      alert(result.error.message);
    } else {
      await loadImagesList();
    }
  }

  /* ===================== TABS ===================== */
  function bindTabs() {
    var tabs = document.getElementById('categoryTabs');
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

      currentFilter = tab.dataset.category;
      renderList(filterByCategory(allImages, currentFilter));
    });
  }

  /* ===================== MODAL ===================== */
  function showModal() {
    document.getElementById('imageModal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    document.getElementById('imageModal').style.display = 'none';
    document.body.style.overflow = '';
    editingImageId = null;
    clearFormMessage();
  }

  function bindModalClose() {
    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('modalBackdrop').addEventListener('click', hideModal);
    document.getElementById('formCancelBtn').addEventListener('click', hideModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('imageModal').style.display !== 'none') {
        hideModal();
      }
    });
  }

  /* ===================== CREATE / EDIT ===================== */
  function bindCreateButton() {
    var btn = document.getElementById('createImageBtn');
    if (btn) btn.addEventListener('click', openCreateModal);
  }

  function openCreateModal() {
    editingImageId = null;
    document.getElementById('modalTitle').textContent = 'Add Image';
    document.getElementById('formSubmitBtn').textContent = 'Save';
    document.getElementById('imageForm').reset();
    document.getElementById('imgOrder').value = '0';
    document.getElementById('imgActive').checked = true;
    showModal();
  }

  function openEditModal(id) {
    var img = allImages.find(function (item) { return item.id === id; });
    if (!img) return;

    editingImageId = id;
    document.getElementById('modalTitle').textContent = 'Edit Image';
    document.getElementById('formSubmitBtn').textContent = 'Save Changes';

    document.getElementById('imgFileBase').value = img.file_base || '';
    document.getElementById('imgAlt').value = img.alt || '';
    document.getElementById('imgCaption').value = img.caption || '';
    document.getElementById('imgCategories').value = (img.categories || []).join(', ');
    document.getElementById('imgJpeg').value = img.image_jpeg || '';
    document.getElementById('imgSrcsetWebp').value = (img.srcset_webp || []).join(', ');
    document.getElementById('imgWidth').value = img.width || '';
    document.getElementById('imgHeight').value = img.height || '';
    document.getElementById('imgOrder').value = img.sort_order || 0;
    document.getElementById('imgActive').checked = img.active !== false;

    showModal();
  }

  /* ===================== FORM SUBMIT ===================== */
  function bindFormEvents() {
    document.getElementById('imageForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var data = collectFormData();
      var msg = document.getElementById('formMessage');

      if (!data.file_base.trim()) {
        showFormMessage(msg, 'File Base is required.', 'error');
        return;
      }
      if (!data.alt.trim()) {
        showFormMessage(msg, 'Alt text is required.', 'error');
        return;
      }
      if (!data.image_jpeg.trim()) {
        showFormMessage(msg, 'JPEG path is required.', 'error');
        return;
      }

      showFormMessage(msg, 'Saving...', 'info');

      var result;
      if (editingImageId) {
        result = await AIKYAM_Gallery.updateImage(editingImageId, data);
      } else {
        result = await AIKYAM_Gallery.createImage(data);
      }

      if (result.error) {
        showFormMessage(msg, result.error.message, 'error');
      } else {
        hideModal();
        await loadImagesList();
      }
    });
  }

  function collectFormData() {
    var categoriesStr = document.getElementById('imgCategories').value.trim();
    var categories = categoriesStr ? categoriesStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];

    var srcsetStr = document.getElementById('imgSrcsetWebp').value.trim();
    var srcsetWebp = srcsetStr ? srcsetStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];

    var widthVal = document.getElementById('imgWidth').value;
    var heightVal = document.getElementById('imgHeight').value;

    return {
      file_base: document.getElementById('imgFileBase').value.trim(),
      alt: document.getElementById('imgAlt').value.trim(),
      caption: document.getElementById('imgCaption').value.trim(),
      categories: categories,
      image_jpeg: document.getElementById('imgJpeg').value.trim(),
      srcset_webp: srcsetWebp,
      width: widthVal ? parseInt(widthVal, 10) : null,
      height: heightVal ? parseInt(heightVal, 10) : null,
      sort_order: parseInt(document.getElementById('imgOrder').value, 10) || 0,
      active: document.getElementById('imgActive').checked
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

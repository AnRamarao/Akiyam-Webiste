/*
  AIKYAM — Event Registration Page Logic
  - Loads published events into dropdown
  - Handles form submission (no login required)
  - Shows confirmation with event details
*/

(function () {
  'use strict';

  var allEvents = [];

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.AIKYAM_Registration) return;

    await loadEvents();
    bindFormEvents();
    bindRegisterAnother();
    checkPreselectedEvent();
  });

  /* ===================== LOAD EVENTS ===================== */
  async function loadEvents() {
    var select = document.getElementById('regEvent');
    if (!select) return;

    allEvents = await AIKYAM_Registration.fetchRegistrableEvents();

    if (!allEvents.length) {
      select.innerHTML = '<option value="">No upcoming events available</option>';
      return;
    }

    select.innerHTML = '<option value="">— Select an event —</option>'
      + allEvents.map(function (evt) {
        var dateStr = evt.start_at
          ? new Date(evt.start_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Date TBD';
        return '<option value="' + evt.id + '">'
          + escapeHTML(evt.title) + ' — ' + dateStr
          + '</option>';
      }).join('');

    // Show event details when selection changes
    select.addEventListener('change', showEventDetails);
  }

  /* ===================== EVENT DETAILS ===================== */
  function showEventDetails() {
    var select = document.getElementById('regEvent');
    var details = document.getElementById('eventDetails');
    if (!select || !details) return;

    var evt = allEvents.find(function (e) { return e.id === select.value; });
    if (!evt) {
      details.style.display = 'none';
      return;
    }

    var dateStr = evt.start_at
      ? new Date(evt.start_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'Date TBD';
    var locationStr = evt.location || 'TBD';
    var priceStr = evt.price > 0 ? '$' + parseFloat(evt.price).toFixed(2) : 'Free';

    details.innerHTML = '<div class="register-form__event-info">'
      + '<span><strong>Date:</strong> ' + escapeHTML(dateStr) + '</span>'
      + '<span><strong>Location:</strong> ' + escapeHTML(locationStr) + '</span>'
      + '<span><strong>Price:</strong> ' + priceStr + '</span>'
      + '</div>';
    details.style.display = '';
  }

  /* ===================== PRE-SELECT EVENT ===================== */
  function checkPreselectedEvent() {
    var params = new URLSearchParams(window.location.search);
    var eventId = params.get('event');
    if (!eventId) return;

    var select = document.getElementById('regEvent');
    if (!select) return;

    // Try to select the event
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === eventId) {
        select.value = eventId;
        showEventDetails();
        break;
      }
    }
  }

  /* ===================== FORM SUBMIT ===================== */
  function bindFormEvents() {
    var form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = document.getElementById('formMessage');
      var btn = document.getElementById('formSubmitBtn');

      var data = {
        event_id: document.getElementById('regEvent').value,
        full_name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        guests: parseInt(document.getElementById('regGuests').value, 10) || 1,
        notes: document.getElementById('regNotes').value
      };

      // Client-side validation
      if (!data.event_id) { showMessage(msg, 'Please select an event.', 'error'); return; }
      if (!data.full_name.trim()) { showMessage(msg, 'Please enter your name.', 'error'); return; }
      if (!data.email.trim()) { showMessage(msg, 'Please enter your email.', 'error'); return; }

      showMessage(msg, 'Submitting registration...', 'info');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      var result = await AIKYAM_Registration.registerForEvent(data);

      if (result.error) {
        showMessage(msg, result.error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Register';
        return;
      }

      // Success — show confirmation
      showConfirmation(data);
    });
  }

  /* ===================== CONFIRMATION ===================== */
  function showConfirmation(data) {
    document.getElementById('registerCard').style.display = 'none';
    var card = document.getElementById('confirmationCard');
    card.style.display = '';

    // Find event details
    var evt = allEvents.find(function (e) { return e.id === data.event_id; });
    var eventTitle = evt ? evt.title : 'Event';
    var dateStr = evt && evt.start_at
      ? new Date(evt.start_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'Date TBD';
    var locationStr = evt ? (evt.location || 'TBD') : 'TBD';

    document.getElementById('confirmationText').textContent =
      'Thank you, ' + data.full_name.trim() + '! You are registered for ' + eventTitle + '.';

    document.getElementById('confirmationDetails').innerHTML =
      '<p><strong>Event:</strong> ' + escapeHTML(eventTitle) + '</p>'
      + '<p><strong>Date:</strong> ' + escapeHTML(dateStr) + '</p>'
      + '<p><strong>Location:</strong> ' + escapeHTML(locationStr) + '</p>'
      + '<p><strong>Guests:</strong> ' + data.guests + '</p>'
      + '<p class="register-card__email-note">A confirmation will be sent to <strong>' + escapeHTML(data.email) + '</strong></p>';
  }

  /* ===================== REGISTER ANOTHER ===================== */
  function bindRegisterAnother() {
    var btn = document.getElementById('registerAnotherBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      document.getElementById('confirmationCard').style.display = 'none';
      document.getElementById('registerCard').style.display = '';
      document.getElementById('registerForm').reset();
      document.getElementById('regGuests').value = '1';
      document.getElementById('eventDetails').style.display = 'none';
      var msg = document.getElementById('formMessage');
      if (msg) { msg.textContent = ''; msg.className = 'register-form__message'; }
      var btn2 = document.getElementById('formSubmitBtn');
      btn2.disabled = false;
      btn2.textContent = 'Register';
    });
  }

  /* ===================== HELPERS ===================== */
  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'register-form__message register-form__message--' + type;
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();

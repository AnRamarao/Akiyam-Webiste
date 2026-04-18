/*
  AIKYAM — Event Registration Module (Supabase)
  - Public registration (no login required — uses anon key)
  - Fetch published events for registration dropdown
  - Admin: fetch all registrations
*/

(function () {
  'use strict';

  /* ===================== HELPERS ===================== */
  function getClient() {
    if (window.AIKYAM_Auth && AIKYAM_Auth.getClient) {
      return AIKYAM_Auth.getClient();
    }
    // Fallback: create anon client for public registration
    var config = window.AIKYAM_CONFIG || {};
    if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY && typeof supabase !== 'undefined') {
      return supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }
    return null;
  }

  /* ===================== PUBLIC: FETCH EVENTS ===================== */
  // Returns published upcoming events for the registration dropdown
  async function fetchRegistrableEvents() {
    var client = getClient();
    if (!client) return [];

    var { data, error } = await client
      .from('events')
      .select('id, title, start_at, location, price, tbd')
      .eq('status', 'published')
      .order('start_at', { ascending: true });

    if (error) {
      console.error('AIKYAM Registration: Failed to fetch events', error.message);
      return [];
    }
    return data || [];
  }

  /* ===================== PUBLIC: REGISTER ===================== */
  async function registerForEvent(regData) {
    var client = getClient();
    if (!client) return { error: { message: 'Service unavailable. Please try again later.' } };

    // Basic validation
    if (!regData.event_id) return { error: { message: 'Please select an event.' } };
    if (!regData.full_name || !regData.full_name.trim()) return { error: { message: 'Name is required.' } };
    if (!regData.email || !regData.email.trim()) return { error: { message: 'Email is required.' } };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email)) return { error: { message: 'Please enter a valid email address.' } };

    var { data, error } = await client
      .from('event_registrations')
      .insert({
        event_id: regData.event_id,
        full_name: regData.full_name.trim(),
        email: regData.email.trim().toLowerCase(),
        phone: (regData.phone || '').trim(),
        guests: regData.guests || 1,
        notes: (regData.notes || '').trim()
      })
      .select()
      .single();

    return { data: data, error: error };
  }

  /* ===================== ADMIN: FETCH REGISTRATIONS ===================== */
  async function fetchAllRegistrations() {
    var client = getClient();
    if (!client) return [];

    var { data, error } = await client
      .from('event_registrations')
      .select('*, events(title, start_at)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('AIKYAM Registration: Failed to fetch registrations', error.message);
      return [];
    }
    return data || [];
  }

  async function fetchRegistrationsByEvent(eventId) {
    var client = getClient();
    if (!client) return [];

    var { data, error } = await client
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('AIKYAM Registration: Failed to fetch registrations', error.message);
      return [];
    }
    return data || [];
  }

  async function updateRegistration(id, changes) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { data, error } = await client
      .from('event_registrations')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    return { data: data, error: error };
  }

  async function deleteRegistration(id) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { error } = await client.from('event_registrations').delete().eq('id', id);
    return { error: error };
  }

  /* ===================== PUBLIC API ===================== */
  window.AIKYAM_Registration = {
    fetchRegistrableEvents: fetchRegistrableEvents,
    registerForEvent: registerForEvent,
    fetchAllRegistrations: fetchAllRegistrations,
    fetchRegistrationsByEvent: fetchRegistrationsByEvent,
    updateRegistration: updateRegistration,
    deleteRegistration: deleteRegistration
  };
})();

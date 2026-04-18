/*
  AIKYAM — Events Module (Supabase)
  - CRUD operations for event management
  - Content lifecycle: Draft → Published → Deactivated → Expired
*/

(function () {
  'use strict';

  /* ===================== CONSTANTS ===================== */
  var STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    DEACTIVATED: 'deactivated',
    EXPIRED: 'expired'
  };

  /* ===================== HELPERS ===================== */
  function getClient() {
    if (window.AIKYAM_Auth && AIKYAM_Auth.getClient) {
      return AIKYAM_Auth.getClient();
    }
    return null;
  }

  async function getCurrentUserId() {
    if (!window.AIKYAM_Auth) return null;
    var session = await AIKYAM_Auth.getSession();
    return session ? session.user.id : null;
  }

  async function getCurrentRole() {
    if (!window.AIKYAM_Auth) return null;
    var profile = await AIKYAM_Auth.getProfile();
    return profile ? profile.role : null;
  }

  /* ===================== FORMAT MAPPERS ===================== */
  // Converts DB row → format expected by script.js loadData() for upcoming events
  function mapToUpcomingFormat(row) {
    return {
      id: row.id,
      title: row.title,
      start: row.start_at,
      end: row.end_at,
      location: row.location,
      price: parseFloat(row.price) || 0,
      img: row.img,
      desc: row.description,
      tbd: row.tbd || false
    };
  }

  // Converts DB row → format expected by script.js loadData() for past events
  function mapToPastFormat(row) {
    return {
      id: row.id,
      title: row.title,
      date: row.start_at ? row.start_at.split('T')[0] : '',
      img: row.img,
      summary: row.summary || row.description || ''
    };
  }

  /* ===================== CLIENT-SIDE LIFECYCLE ===================== */
  // Supplement to pg_cron: trigger auto-expire and auto-publish on each fetch
  async function runLifecycleChecks(client) {
    try {
      await client.rpc('auto_expire_events');
    } catch (e) { /* ignore — function may not exist yet */ }
    try {
      await client.rpc('auto_publish_events');
    } catch (e) { /* ignore */ }
  }

  /* ===================== PUBLIC FETCH ===================== */
  // Returns { upcoming: [...], past: [...] } in the format loadData() expects
  async function fetchPublicEvents() {
    var client = getClient();
    if (client) {
      try {
        await runLifecycleChecks(client);

        var results = await Promise.all([
          client.from('events').select('*')
            .eq('status', STATUS.PUBLISHED)
            .order('start_at', { ascending: true }),
          client.from('events').select('*')
            .eq('status', STATUS.EXPIRED)
            .order('start_at', { ascending: false })
        ]);

        var upResult = results[0];
        var pastResult = results[1];

        if (!upResult.error && !pastResult.error) {
          return {
            upcoming: (upResult.data || []).map(mapToUpcomingFormat),
            past: (pastResult.data || []).map(mapToPastFormat)
          };
        }
        console.warn('AIKYAM Events: Supabase query error');
      } catch (e) {
        console.warn('AIKYAM Events: Supabase fetch failed', e.message);
      }
    }
    return { upcoming: [], past: [] };
  }

  /* ===================== ADMIN FETCH ===================== */
  // Returns all events (all statuses) as raw DB rows for the admin page
  async function fetchAllEvents() {
    var client = getClient();
    if (!client) return [];

    await runLifecycleChecks(client);

    var { data, error } = await client
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('AIKYAM Events: Failed to fetch all events', error.message);
      return [];
    }
    return data || [];
  }

  /* ===================== CRUD ===================== */
  async function createEvent(eventData) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var role = await getCurrentRole();
    if (!role || !AIKYAM_Auth.hasMinRole(role, 'ProgramManager')) {
      return { error: { message: 'Insufficient permissions' } };
    }

    var userId = await getCurrentUserId();
    var row = {
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || 'TBD',
      price: eventData.price || 0,
      img: eventData.img || 'assets/branding/logo.png',
      tbd: eventData.tbd || false,
      start_at: eventData.start_at || null,
      end_at: eventData.end_at || null,
      summary: eventData.summary || '',
      publish_at: eventData.publish_at || null,
      status: STATUS.DRAFT,
      created_by: userId,
      updated_by: userId
    };

    var { data, error } = await client.from('events').insert(row).select().single();
    return { data: data, error: error };
  }

  async function updateEvent(id, changes) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var role = await getCurrentRole();
    if (!role || !AIKYAM_Auth.hasMinRole(role, 'ProgramManager')) {
      return { error: { message: 'Insufficient permissions' } };
    }

    var userId = await getCurrentUserId();
    changes.updated_by = userId;

    var { data, error } = await client
      .from('events')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    return { data: data, error: error };
  }

  async function publishEvent(id) {
    var role = await getCurrentRole();
    if (!role || !AIKYAM_Auth.hasMinRole(role, 'ContentManager')) {
      return { error: { message: 'Only ContentManager or above can publish events' } };
    }
    return updateEvent(id, { status: STATUS.PUBLISHED, publish_at: null });
  }

  async function deactivateEvent(id) {
    var role = await getCurrentRole();
    if (!role || !AIKYAM_Auth.hasMinRole(role, 'ContentManager')) {
      return { error: { message: 'Only ContentManager or above can deactivate events' } };
    }
    return updateEvent(id, { status: STATUS.DEACTIVATED });
  }

  async function deleteEvent(id) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var role = await getCurrentRole();
    if (!role || !AIKYAM_Auth.isAdmin(role)) {
      return { error: { message: 'Only admins can delete events' } };
    }

    var { error } = await client.from('events').delete().eq('id', id);
    return { error: error };
  }

  async function schedulePublish(id, publishAt) {
    var role = await getCurrentRole();
    if (!role || !AIKYAM_Auth.hasMinRole(role, 'ContentManager')) {
      return { error: { message: 'Only ContentManager or above can schedule publishing' } };
    }
    return updateEvent(id, { publish_at: publishAt, status: STATUS.DRAFT });
  }

  /* ===================== PUBLIC API ===================== */
  window.AIKYAM_Events = {
    STATUS: STATUS,
    fetchPublicEvents: fetchPublicEvents,
    fetchAllEvents: fetchAllEvents,
    createEvent: createEvent,
    updateEvent: updateEvent,
    publishEvent: publishEvent,
    deactivateEvent: deactivateEvent,
    deleteEvent: deleteEvent,
    schedulePublish: schedulePublish
  };
})();

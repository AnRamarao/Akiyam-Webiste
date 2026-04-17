/*
  AIKYAM — Team Module (Supabase)
  - CRUD operations for team member management
  - Covers board members and executive committees by year
  - Public fetch with JSON fallback for graceful degradation
*/

(function () {
  'use strict';

  /* ===================== HELPERS ===================== */
  function getClient() {
    if (window.AIKYAM_Auth && AIKYAM_Auth.getClient) {
      return AIKYAM_Auth.getClient();
    }
    return null;
  }

  /* ===================== FORMAT MAPPERS ===================== */
  // DB row → format expected by personCardHTML() in script.js
  function mapToCardFormat(row) {
    return {
      name: row.name,
      role: row.title,
      img: row.img
    };
  }

  /* ===================== PUBLIC FETCH ===================== */
  // Returns { chairman, boardMembers, executiveByYear } in the format loadData() expects
  async function fetchPublicTeam() {
    var client = getClient();
    if (client) {
      try {
        var { data, error } = await client
          .from('team_members')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });

        if (!error && data) {
          var chairman = null;
          var boardMembers = [];
          var executiveByYear = {};

          data.forEach(function (row) {
            if (row.team_group === 'board') {
              if (row.is_chairman) {
                chairman = mapToCardFormat(row);
              } else {
                boardMembers.push(mapToCardFormat(row));
              }
            } else if (row.team_group === 'executive') {
              var yr = row.year || 0;
              if (!executiveByYear[yr]) executiveByYear[yr] = [];
              executiveByYear[yr].push(mapToCardFormat(row));
            }
          });

          return {
            chairman: chairman,
            boardMembers: boardMembers,
            executiveByYear: executiveByYear
          };
        }
        console.warn('AIKYAM Team: Supabase query error, falling back to JSON');
      } catch (e) {
        console.warn('AIKYAM Team: Supabase fetch failed, falling back to JSON', e.message);
      }
    }
    return fetchFromJSON();
  }

  /* ===================== ADMIN FETCH ===================== */
  async function fetchAllMembers() {
    var client = getClient();
    if (!client) return [];

    var { data, error } = await client
      .from('team_members')
      .select('*')
      .order('team_group', { ascending: true })
      .order('year', { ascending: false, nullsFirst: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('AIKYAM Team: Failed to fetch all members', error.message);
      return [];
    }
    return data || [];
  }

  /* ===================== CRUD ===================== */
  async function createMember(memberData) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { data, error } = await client
      .from('team_members')
      .insert({
        name: memberData.name,
        title: memberData.title || '',
        img: memberData.img || 'assets/branding/logo.png',
        team_group: memberData.team_group || 'executive',
        year: memberData.year || null,
        is_chairman: memberData.is_chairman || false,
        sort_order: memberData.sort_order || 0,
        active: memberData.active !== false
      })
      .select()
      .single();

    return { data: data, error: error };
  }

  async function updateMember(id, changes) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { data, error } = await client
      .from('team_members')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    return { data: data, error: error };
  }

  async function deleteMember(id) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { error } = await client.from('team_members').delete().eq('id', id);
    return { error: error };
  }

  /* ===================== JSON FALLBACK ===================== */
  async function fetchFromJSON() {
    try {
      var results = await Promise.all([
        fetch('./data/boardMembers.json'),
        fetch('./data/coreTeam.json'),
        fetch('./data/coreTeam2026.json')
      ]);
      var board = results[0].ok ? await results[0].json() : { chairman: null, members: [] };
      var core = results[1].ok ? await results[1].json() : [];
      var core2026 = results[2].ok ? await results[2].json() : [];

      // Map to match coreTeam naming: name, role, img -> name, role, img (already matches)
      return {
        chairman: board.chairman || null,
        boardMembers: board.members || [],
        executiveByYear: { 2025: core, 2026: core2026 }
      };
    } catch (e) {
      console.error('AIKYAM Team: JSON fallback failed', e.message);
      return { chairman: null, boardMembers: [], executiveByYear: {} };
    }
  }

  /* ===================== PUBLIC API ===================== */
  window.AIKYAM_Team = {
    fetchPublicTeam: fetchPublicTeam,
    fetchAllMembers: fetchAllMembers,
    createMember: createMember,
    updateMember: updateMember,
    deleteMember: deleteMember
  };
})();

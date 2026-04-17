/*
  AIKYAM — Vendors Module (Supabase)
  - CRUD operations for vendor directory
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
  // DB row → format expected by makeVendorCard() / renderVendors() in script.js
  function mapToVendorFormat(row) {
    return {
      'Category': row.category,
      'Sub-Category': row.sub_category,
      'Vendor Name': row.vendor_name,
      'Vendor Phone': row.vendor_phone,
      'Referred By': row.referred_by,
      'Referral Comment about Vendor': row.comment,
      _id: row.id
    };
  }

  /* ===================== PUBLIC FETCH ===================== */
  async function fetchPublicVendors() {
    var client = getClient();
    if (client) {
      try {
        var { data, error } = await client
          .from('vendors')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });

        if (!error && data) {
          return data.map(mapToVendorFormat);
        }
        console.warn('AIKYAM Vendors: Supabase query error, falling back to JSON');
      } catch (e) {
        console.warn('AIKYAM Vendors: Supabase fetch failed, falling back to JSON', e.message);
      }
    }
    return fetchFromJSON();
  }

  /* ===================== ADMIN FETCH ===================== */
  async function fetchAllVendors() {
    var client = getClient();
    if (!client) return [];

    var { data, error } = await client
      .from('vendors')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('AIKYAM Vendors: Failed to fetch all vendors', error.message);
      return [];
    }
    return data || [];
  }

  /* ===================== CRUD ===================== */
  async function createVendor(vendorData) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { data, error } = await client
      .from('vendors')
      .insert({
        category: vendorData.category,
        sub_category: vendorData.sub_category || '',
        vendor_name: vendorData.vendor_name,
        vendor_phone: vendorData.vendor_phone || '',
        referred_by: vendorData.referred_by || '',
        comment: vendorData.comment || '',
        sort_order: vendorData.sort_order || 0,
        active: vendorData.active !== false
      })
      .select()
      .single();

    return { data: data, error: error };
  }

  async function updateVendor(id, changes) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { data, error } = await client
      .from('vendors')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    return { data: data, error: error };
  }

  async function deleteVendor(id) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { error } = await client.from('vendors').delete().eq('id', id);
    return { error: error };
  }

  /* ===================== JSON FALLBACK ===================== */
  async function fetchFromJSON() {
    try {
      var resp = await fetch('./data/vendors.json');
      return resp.ok ? await resp.json() : [];
    } catch (e) {
      console.error('AIKYAM Vendors: JSON fallback failed', e.message);
      return [];
    }
  }

  /* ===================== PUBLIC API ===================== */
  window.AIKYAM_Vendors = {
    fetchPublicVendors: fetchPublicVendors,
    fetchAllVendors: fetchAllVendors,
    createVendor: createVendor,
    updateVendor: updateVendor,
    deleteVendor: deleteVendor
  };
})();

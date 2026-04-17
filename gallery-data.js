/*
  AIKYAM — Gallery Module (Supabase)
  - CRUD operations for gallery image management
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
  // DB row → format expected by loadGallery() in script.js
  function mapToGalleryFormat(row) {
    return {
      id: row.file_base,
      fileBase: row.file_base,
      alt: row.alt,
      caption: row.caption,
      categories: row.categories || [],
      width: row.width,
      height: row.height,
      srcsetWebp: row.srcset_webp || [],
      imageJpeg: row.image_jpeg
    };
  }

  /* ===================== PUBLIC FETCH ===================== */
  async function fetchPublicGallery() {
    var client = getClient();
    if (client) {
      try {
        var { data, error } = await client
          .from('gallery_images')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true });

        if (!error && data) {
          return data.map(mapToGalleryFormat);
        }
        console.warn('AIKYAM Gallery: Supabase query error, falling back to JSON');
      } catch (e) {
        console.warn('AIKYAM Gallery: Supabase fetch failed, falling back to JSON', e.message);
      }
    }
    return fetchFromJSON();
  }

  /* ===================== ADMIN FETCH ===================== */
  async function fetchAllImages() {
    var client = getClient();
    if (!client) return [];

    var { data, error } = await client
      .from('gallery_images')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('AIKYAM Gallery: Failed to fetch all images', error.message);
      return [];
    }
    return data || [];
  }

  /* ===================== CRUD ===================== */
  async function createImage(imageData) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { data, error } = await client
      .from('gallery_images')
      .insert({
        file_base: imageData.file_base,
        alt: imageData.alt || '',
        caption: imageData.caption || '',
        categories: imageData.categories || [],
        width: imageData.width || null,
        height: imageData.height || null,
        srcset_webp: imageData.srcset_webp || [],
        image_jpeg: imageData.image_jpeg || '',
        sort_order: imageData.sort_order || 0,
        active: imageData.active !== false
      })
      .select()
      .single();

    return { data: data, error: error };
  }

  async function updateImage(id, changes) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { data, error } = await client
      .from('gallery_images')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    return { data: data, error: error };
  }

  async function deleteImage(id) {
    var client = getClient();
    if (!client) return { error: { message: 'Database unavailable' } };

    var { error } = await client.from('gallery_images').delete().eq('id', id);
    return { error: error };
  }

  /* ===================== JSON FALLBACK ===================== */
  async function fetchFromJSON() {
    try {
      var resp = await fetch('./data/galleryImages.json');
      return resp.ok ? await resp.json() : [];
    } catch (e) {
      console.error('AIKYAM Gallery: JSON fallback failed', e.message);
      return [];
    }
  }

  /* ===================== PUBLIC API ===================== */
  window.AIKYAM_Gallery = {
    fetchPublicGallery: fetchPublicGallery,
    fetchAllImages: fetchAllImages,
    createImage: createImage,
    updateImage: updateImage,
    deleteImage: deleteImage
  };
})();

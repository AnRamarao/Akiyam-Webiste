/*
  AIKYAM — Gallery Module (Supabase)
  - CRUD operations for gallery image management
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
        console.warn('AIKYAM Gallery: Supabase query error');
      } catch (e) {
        console.warn('AIKYAM Gallery: Supabase fetch failed', e.message);
      }
    }
    return [];
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

  /* ===================== PUBLIC API ===================== */
  window.AIKYAM_Gallery = {
    fetchPublicGallery: fetchPublicGallery,
    fetchAllImages: fetchAllImages,
    createImage: createImage,
    updateImage: updateImage,
    deleteImage: deleteImage
  };
})();

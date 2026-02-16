/**
 * Brand resolution: Always uses GlobalBanka (single brand mode).
 * Multidomain support removed - all requests resolve to globalbanka.
 */

import { supabaseAdmin } from './supabase';

const CACHE_TTL_MS = 60 * 1000; // 1 min so theme/language from Business tab apply soon after save
const cache = new Map(); // key: 'globalbanka' → { brand, timestamp }

/**
 * Always returns globalbanka brand (domain parameter ignored).
 * Kept for backwards compatibility but no longer resolves by domain.
 */
export async function getBrandByDomain() {
  // Always return globalbanka regardless of domain
  return getBrandBySlug('globalbanka');
}

/**
 * Always returns globalbanka brand (request parameter ignored).
 * For use in API routes and server components.
 * @returns {Promise<{ id, slug, name, logo_url, theme, default_language, supported_languages } | null>}
 */
export async function getResolvedBrand() {
  // Always return globalbanka in single-brand mode
  return getBrandBySlug('globalbanka');
}

/**
 * Get brand by slug (for default brand when domain does not match).
 */
export async function getBrandBySlug(slug) {
  if (!slug || !supabaseAdmin) return null;
  const cacheKey = `slug:${slug}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.brand;

  try {
    const { data: brand, error } = await supabaseAdmin
      .from('brands')
      .select('id, slug, name, logo_url, theme, default_language, supported_languages')
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !brand) return null;
    const result = {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      logo_url: brand.logo_url ?? null,
      theme: brand.theme ?? { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
      default_language: brand.default_language ?? 'en',
      supported_languages: brand.supported_languages ?? ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'],
    };
    cache.set(cacheKey, { brand: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('brandResolution getBrandBySlug error:', err?.message);
    return null;
  }
}

export function clearBrandCache() {
  cache.clear();
}

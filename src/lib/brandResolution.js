/**
 * Brand resolution: domain → brand (id, slug, config).
 * Used by API routes and server components; cached in memory.
 */

import { supabaseAdmin } from './supabase';

const CACHE_TTL_MS = 60 * 1000; // 1 min so theme/language from Business tab apply soon after save
const cache = new Map(); // key: normalized domain → { brand, timestamp }

function normalizeDomain(host) {
  if (!host || typeof host !== 'string') return '';
  return host.split(':')[0].toLowerCase().replace(/^www\./, '').trim();
}

/**
 * Resolve brand by domain. Returns { id, slug, name, logo_url, theme, default_language, supported_languages } or null.
 * Uses in-memory cache with TTL.
 */
export async function getBrandByDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return null;

  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.brand;
  }

  if (!supabaseAdmin) return null;

  try {
    const { data: row, error } = await supabaseAdmin
      .from('brand_domains')
      .select('brand_id, brands(id, slug, name, logo_url, theme, default_language, supported_languages, is_active)')
      .eq('domain', normalized)
      .limit(1)
      .maybeSingle();

    if (error || !row?.brands) return null;
    const brand = row.brands;
    if (!brand || !brand.is_active) return null;

    const result = {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      logo_url: brand.logo_url ?? null,
      theme: brand.theme ?? { mode: 'light', primaryColor: '#2563eb', fontHeading: 'Inter', fontBody: 'Inter' },
      default_language: brand.default_language ?? 'en',
      supported_languages: brand.supported_languages ?? ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'],
    };
    cache.set(normalized, { brand: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('brandResolution getBrandByDomain error:', err?.message);
    return null;
  }
}

/**
 * Resolve brand from request (Host header). For use in API routes and server components.
 * @param {Request} request - Next.js request
 * @returns {Promise<{ id, slug, name, logo_url, theme, default_language, supported_languages } | null>}
 */
export async function getResolvedBrand(request) {
  const host =
    request?.headers?.get?.('x-forwarded-host') ||
    request?.headers?.get?.('host') ||
    '';
  const brand = await getBrandByDomain(host);
  if (brand) return brand;
  // Fallback: default brand from env or first active brand
  const defaultSlug = process.env.NEXT_PUBLIC_DEFAULT_BRAND_SLUG || 'globalbanka';
  return getBrandBySlug(defaultSlug);
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

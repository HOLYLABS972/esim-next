/**
 * Airalo API Sync Service
 * Authenticates with Airalo, fetches packages, and maps them to esim_packages schema.
 */

const AIRALO_API_BASE = 'https://partners-api.airalo.com/v2';

/**
 * Authenticate with Airalo API and return an access token.
 */
export async function authenticateAiralo() {
  const clientId = process.env.AIRALO_CLIENT_ID;
  const clientSecret = process.env.AIRALO_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing AIRALO_CLIENT_ID or AIRALO_SECRET environment variables');
  }

  const res = await fetch(`${AIRALO_API_BASE}/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airalo auth failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const token = json.data?.access_token;
  if (!token) throw new Error('No access_token in Airalo auth response');
  return token;
}

/**
 * Fetch all packages from Airalo API, handling pagination.
 */
export async function fetchAllAiraloPackages(accessToken) {
  const allData = [];
  let page = 1;
  let lastPage = 1;

  while (page <= lastPage) {
    const url = `${AIRALO_API_BASE}/packages?limit=300&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airalo packages fetch failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    if (json.data && Array.isArray(json.data)) {
      allData.push(...json.data);
    }

    lastPage = json.meta?.last_page || 1;
    page++;
  }

  return allData;
}

/**
 * Map Airalo API response to flat esim_packages rows.
 *
 * Airalo structure:
 *   data[i] = { slug, country_code, title, image, operators[] }
 *   operators[j] = { title, type, rechargeability, plan_type, coverages, packages[] }
 *   packages[k] = { id, title, price, day, amount, data, is_unlimited, voice, text, ... }
 */
export function mapAiraloToEsimPackages(airaloData) {
  const rows = [];
  const seen = new Set();

  for (const item of airaloData) {
    const countryCode = item.country_code || null;
    const operators = item.operators || [];

    for (const operator of operators) {
      const packages = operator.packages || [];
      const operatorTitle = operator.title || '';
      const operatorType = (operator.type || '').toLowerCase();
      const rechargeability = operator.rechargeability === true || operator.rechargeability === 'true';

      // Derive package_type
      let packageType = 'country';
      if (operatorType === 'global' || item.slug === 'world') {
        packageType = 'global';
      } else if (operatorType === 'regional' || operatorType === 'region') {
        packageType = 'regional';
      }

      // Build country_code for regional/global: comma-separated list of covered countries
      let effectiveCountryCode = countryCode;
      if (packageType !== 'country' && operator.countries && Array.isArray(operator.countries)) {
        const codes = operator.countries.map(c => c.country_code).filter(Boolean);
        effectiveCountryCode = codes.length > 0 ? codes.join(',') : countryCode;
      }

      // Extract speed from coverages
      let speed = null;
      try {
        const networks = operator.coverages?.[0]?.networks || [];
        const types = networks.flatMap(n => n.types || []);
        if (types.length > 0) speed = [...new Set(types)].join('/');
      } catch (_) { /* ignore */ }

      for (const pkg of packages) {
        const pkgId = pkg.id;
        if (!pkgId || seen.has(pkgId)) continue;
        seen.add(pkgId);

        const amountMb = typeof pkg.amount === 'number' ? pkg.amount : parseInt(pkg.amount, 10) || null;
        const isUnlimited = pkg.is_unlimited === true || amountMb === 0;

        // Multi-currency prices
        const prices = pkg.prices || {};
        const retailPrices = prices.recommended_retail_price || {};

        rows.push({
          package_id: pkgId,
          title: pkg.title || `${pkg.data || ''} - ${pkg.day || ''} days`,
          title_ru: null, // preserved via upsert merge
          price_usd: parseFloat(pkg.price) || parseFloat(retailPrices.USD) || 0,
          price_rub: null, // backfilled via update_price_rub()
          price_ils: parseFloat(retailPrices.ILS) || null,
          price_aud: parseFloat(retailPrices.AUD) || null,
          price_eur: parseFloat(retailPrices.EUR) || null,
          price_cad: parseFloat(retailPrices.CAD) || null,
          data_amount: pkg.data || (amountMb ? `${amountMb}MB` : null),
          data_amount_mb: isUnlimited ? 0 : amountMb,
          validity_days: typeof pkg.day === 'number' ? pkg.day : parseInt(pkg.day, 10) || null,
          is_active: true,
          is_unlimited: isUnlimited,
          voice_included: pkg.voice != null && pkg.voice !== '' && pkg.voice !== 0 && pkg.voice !== '0',
          sms_included: pkg.text != null && pkg.text !== '' && pkg.text !== 0 && pkg.text !== '0',
          operator: operatorTitle,
          country_code: effectiveCountryCode,
          package_type: packageType,
          plan_type: 'base', // All Airalo packages are base packages (support_topup indicates if they can be recharged)
          support_topup: rechargeability,
          speed: speed || null,
          slug: item.slug || null,
        });
      }
    }
  }

  return rows;
}

/**
 * Extract unique countries from Airalo response for esim_countries upsert.
 */
export function extractCountries(airaloData) {
  const countriesMap = new Map();

  for (const item of airaloData) {
    const code = (item.country_code || '').toUpperCase();
    if (code && code.length === 2 && !countriesMap.has(code)) {
      countriesMap.set(code, {
        airalo_country_code: code,
        country_name: item.title || code,
        flag_url: item.image?.url || `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
        is_visible: true,
      });
    }

    // Also extract from nested operator countries
    for (const operator of item.operators || []) {
      for (const country of operator.countries || []) {
        const cc = (country.country_code || '').toUpperCase();
        if (cc && cc.length === 2 && !countriesMap.has(cc)) {
          countriesMap.set(cc, {
            airalo_country_code: cc,
            country_name: country.title || cc,
            flag_url: country.image?.url || `https://flagcdn.com/w40/${cc.toLowerCase()}.png`,
            is_visible: true,
          });
        }
      }
    }
  }

  return Array.from(countriesMap.values());
}

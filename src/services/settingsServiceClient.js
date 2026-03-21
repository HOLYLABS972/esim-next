// Client-safe settings service - fetches from API so admin Site config applies on reload

const DEFAULT = { discountPercentage: 0, minimumPrice: 0.5 };

// Cache for settings (short TTL so admin changes apply soon)
let settingsCache = null;
let settingsCacheTimestamp = null;
const SETTINGS_CACHE_DURATION = 15 * 1000; // 15 seconds so admin discount changes apply soon

export const getRegularSettings = async () => {
  if (settingsCache && settingsCacheTimestamp && Date.now() - settingsCacheTimestamp < SETTINGS_CACHE_DURATION) {
    return settingsCache;
  }

  try {
    const res = await fetch('/api/public/settings', { cache: 'no-store', credentials: 'same-origin' });
    const data = await res.json();
    const settings = {
      discountPercentage: Math.max(0, Math.min(100, Number(data?.discountPercentage) ?? 0)),
      minimumPrice: Math.max(0, Number(data?.minimumPrice) ?? 0.5),
    };
    settingsCache = settings;
    settingsCacheTimestamp = Date.now();
    return settings;
  } catch {
    settingsCache = DEFAULT;
    settingsCacheTimestamp = Date.now();
    return DEFAULT;
  }
};

export default {
  getRegularSettings
};


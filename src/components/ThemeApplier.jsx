'use client';

import { useEffect } from 'react';

/**
 * Fetches appearance theme (per-domain or global) and applies it to the document.
 * Uses domain-appearance API (per-domain theme, fallback to admin_config).
 * Sets class "dark" on html for Tailwind dark: variants and data-theme for CSS.
 */
export default function ThemeApplier() {
  useEffect(() => {
    let cancelled = false;
    const apply = (theme) => {
      if (typeof document === 'undefined') return;
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    fetch('/api/public/domain-appearance', { cache: 'no-store', credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const theme = data?.theme === 'dark' ? 'dark' : 'light';
        apply(theme);
      })
      .catch(() => {
        if (!cancelled) apply('light');
      });

    return () => { cancelled = true; };
  }, []);

  return null;
}

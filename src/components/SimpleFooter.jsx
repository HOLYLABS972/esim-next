'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '../contexts/I18nContext';
import { useState, useEffect } from 'react';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

function GlobalbankaFooter() {
  return (
    <div className="mt-auto">
      {/* VPN Banner */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <a href="https://www.foxywall.xyz" target="_blank" rel="noopener noreferrer" className="block p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🦊</span>
                <span className="text-white font-bold text-lg">FoxyWall VPN</span>
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-30%</span>
              </div>
              <p className="text-gray-300 text-sm mb-3">Безопасный VPN для всех устройств. Без логов, без ограничений.</p>
              <span className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                Попробовать бесплатно →
              </span>
            </div>
            <div className="text-5xl ml-4 hidden sm:block">🛡️</div>
          </div>
        </a>
      </div>

      {/* Telegram Bot Banner */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0088cc 0%, #005f8f 100%)' }}>
        <a href="https://t.me/globalbankaesimbot" target="_blank" rel="noopener noreferrer" className="block p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✈️</span>
                <span className="text-white font-bold text-lg">Telegram Бот</span>
              </div>
              <p className="text-gray-200 text-sm mb-3">Покупайте eSIM прямо в Telegram. Быстро, удобно, без регистрации.</p>
              <span className="inline-block bg-white text-blue-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors hover:bg-gray-100">
                Открыть бот @globalbankaesimbot →
              </span>
            </div>
            <div className="text-5xl ml-4 hidden sm:block">🤖</div>
          </div>
        </a>
      </div>

      {/* Minimal copyright + support link */}
      <div className="text-center py-4 px-4">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <span>© 2026 Глобалбанка eSIM</span>
          <span>·</span>
          <a href="https://t.me/holylabsltd" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">Поддержка</a>
          <span>·</span>
          <Link href="/ru/privacy-policy" className="hover:text-gray-300 transition-colors">Конфиденциальность</Link>
        </div>
      </div>
    </div>
  );
}

function RoamJetFooter({ langPrefix, buildUrl }) {
  const SOCIAL_LINKS = [
    { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61587473507744', icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { name: 'Instagram', url: 'https://www.instagram.com/esim.roamjet/', icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
    { name: 'X', url: 'https://x.com/roamjet', icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { name: 'Trustpilot', url: 'https://www.trustpilot.com/review/roamjet.net', icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold text-white">🌐 RoamJet</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Your trusted partner for global eSIM connectivity. Stay connected worldwide with our reliable data plans.</p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white transition-colors" title={link.name}>{link.icon}</a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href={buildUrl(`${langPrefix}/faq`)} className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/affiliate`)} className="hover:text-white transition-colors">Affiliate</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/login`)} className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/blog`)} className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Useful Links</h3>
            <ul className="space-y-2">
              <li><Link href={buildUrl(`${langPrefix}/device-compatibility`)} className="hover:text-white transition-colors">Device Compatibility</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/privacy-policy`)} className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/terms-of-service`)} className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><a href="mailto:dima@holylabs.net" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-500">© 2026 RoamJet. All Rights Reserved · v{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}

export default function SimpleFooter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [isGlobalbanka, setIsGlobalbanka] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsGlobalbanka(window.location.hostname.includes('globalbanka'));
    }
  }, []);

  if (pathname?.startsWith('/vpn')) return null;

  const langMatch = pathname?.match(/^\/(ar|de|es|fr|he|ru)(?:\/|$)/);
  const langPrefix = langMatch ? `/${langMatch[1]}` : '';

  const currentParams = () => {
    const p = {};
    searchParams?.forEach((v, k) => { p[k] = v; });
    return p;
  };

  const buildUrl = (path) => {
    const params = currentParams();
    const qs = new URLSearchParams(params).toString();
    return path + (qs ? `?${qs}` : '');
  };

  if (isGlobalbanka) return <GlobalbankaFooter />;
  return <RoamJetFooter langPrefix={langPrefix} buildUrl={buildUrl} />;
}

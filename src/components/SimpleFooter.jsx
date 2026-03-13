'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '../contexts/I18nContext';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

const SOCIAL_LINKS = [
  {
    name: 'Telegram',
    url: 'https://t.me/globalbankaesimbot',
    icon: (
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
];

export default function SimpleFooter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

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

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold text-white">🌐 Глобалбанка eSIM</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Ваш надёжный партнёр для eSIM по всему миру. Оставайтесь на связи в любой точке мира.
            </p>
            {/* Social Icons */}
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white transition-colors"
                  title={link.name}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Навигация</h3>
            <ul className="space-y-2">
              <li><Link href={buildUrl(`${langPrefix}/faq`)} className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/login`)} className="hover:text-white transition-colors">Личный кабинет</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/blog`)} className="hover:text-white transition-colors">Блог</Link></li>
            </ul>
          </div>

          {/* Useful Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Информация</h3>
            <ul className="space-y-2">
              <li><Link href={buildUrl(`${langPrefix}/privacy-policy`)} className="hover:text-white transition-colors">Политика конфиденциальности</Link></li>
              <li><Link href={buildUrl(`${langPrefix}/terms-of-service`)} className="hover:text-white transition-colors">Условия использования</Link></li>
              <li><a href="https://t.me/holylabsltd" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">✈️ Поддержка в Telegram</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-500">© 2026 Глобалбанка eSIM · v{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}

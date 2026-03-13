'use client';

import { usePathname } from 'next/navigation';

export default function SimpleFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith('/vpn')) return null;

  return (
    <div className="text-center py-6 px-4 mt-auto">
      <div className="flex items-center justify-center flex-wrap gap-3 text-sm text-gray-500">
        <a href="https://t.me/globalbankaesimbot" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">✈️ Telegram Бот</a>
        <span>·</span>
        <a href="https://www.foxywall.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">🦊 FoxyWall VPN</a>
      </div>
      <p className="text-xs text-gray-600 mt-2">© 2026 Глобалбанка eSIM</p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SimpleFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith('/vpn')) return null;

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

      {/* Minimal copyright */}
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

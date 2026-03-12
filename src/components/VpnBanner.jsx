'use client';

import React from 'react';
import { useI18n } from '../contexts/I18nContext';

export default function VpnBanner() {
  const { locale } = useI18n();
  const isRu = locale === 'ru';

  const text = isRu
    ? { badge: '🦊 VPN', title: 'FoxyWall VPN — скидка 30%', desc: 'Безопасный VPN для интернета без границ. Оформите подписку на сайте со скидкой 30%!', cta: 'Получить скидку →' }
    : { badge: '🦊 VPN', title: 'FoxyWall VPN — 30% OFF', desc: 'Secure VPN for internet without borders. Subscribe on the web and save 30%!', cta: 'Get 30% Off →' };

  return (
    <a
      href="https://www.foxywall.xyz"
      target="_blank"
      rel="noopener noreferrer"
      className="block mx-auto max-w-4xl my-6"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-[2px] group cursor-pointer">
        <div className="relative rounded-2xl bg-gradient-to-r from-orange-500/95 via-amber-500/95 to-yellow-500/95 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
              🦊
            </div>
            <div>
              <span className="inline-block text-xs font-bold text-white/90 bg-white/20 rounded-full px-2.5 py-0.5 mb-0.5">{text.badge}</span>
              <h3 className="text-lg font-bold text-white leading-tight">{text.title}</h3>
              <p className="text-white/80 text-sm">{text.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white text-orange-600 font-bold px-5 py-2.5 rounded-xl group-hover:bg-orange-50 transition-colors flex-shrink-0 text-sm">
            {text.cta}
          </div>
        </div>
      </div>
    </a>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

const TravelArticles = () => {
  const router = useRouter();

  const articles = [
    {
      image: 'https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=600',
      country: 'Турция',
      countryCode: 'TR',
      flag: '🇹🇷',
      title: 'Интернет в Турции: как оставаться на связи',
      excerpt: 'Анталия, Стамбул, Каппадокия — Турция входит в топ-3 направлений для россиян. Местные SIM-карты требуют регистрации паспорта, а роуминг стоит от 500₽/день. С eSIM — от 273₽ за весь отпуск.',
      price: 'от 273₽',
      data: '1-20 ГБ'
    },
    {
      image: 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=600',
      country: 'Таиланд',
      countryCode: 'TH',
      flag: '🇹🇭',
      title: 'eSIM для Таиланда: интернет без очередей',
      excerpt: 'Бангкок, Пхукет, Самуи — не тратьте время на поиск SIM-карты в аэропорту. Установите eSIM ещё в самолёте и выходите на связь сразу после посадки. Покрытие по всей стране.',
      price: 'от 273₽',
      data: '1-20 ГБ'
    },
    {
      image: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=600',
      country: 'ОАЭ',
      countryCode: 'AE',
      flag: '🇦🇪',
      title: 'Дубай и Абу-Даби: мобильный интернет для туристов',
      excerpt: 'В ОАЭ заблокированы многие VoIP-сервисы, но мобильный интернет работает отлично. С eSIM вы получите быстрый 4G/5G интернет для навигации, соцсетей и мессенджеров.',
      price: 'от 273₽',
      data: '1-20 ГБ'
    }
  ];

  const handleBuy = async (article) => {
    try {
      const res = await fetch(`/api/public/plans?limit=100&country=${article.countryCode}`);
      const data = res.ok ? await res.json() : null;
      const plans = data?.success ? (data.data?.plans || []) : [];
      
      // Find cheapest 1GB plan
      const plan1GB = plans
        .filter(p => {
          const mb = p.data_amount_mb || p.amount || 0;
          const label = (p.data || p.data_amount || '').toString().toLowerCase();
          return mb === 1024 || mb === 1000 || label.includes('1 gb') || label === '1gb';
        })
        .sort((a, b) => (a.price_usd || a.price || 999) - (b.price_usd || b.price || 999))[0];
      
      const plan = plan1GB || plans.sort((a, b) => (a.price_usd || a.price || 999) - (b.price_usd || b.price || 999))[0];
      
      if (plan) {
        const slug = plan.slug || plan.package_id || plan.id;
        router.push(`/share-package/${encodeURIComponent(slug)}?country=${article.countryCode}`);
      } else {
        // Fallback: scroll to search and fill country name
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div id="travel-guides" className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Популярные направления
        </h2>
        <p className="text-gray-400 text-lg">
          Путеводители по мобильному интернету в самых популярных странах
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article, i) => (
          <div key={i} className="bg-gray-800/90 backdrop-blur-md rounded-xl border border-gray-700/50 overflow-hidden hover:border-blue-400/50 transition-all duration-300 group">
            <div className="relative h-48 overflow-hidden">
              <img
                src={article.image}
                alt={article.country}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">{article.flag} {article.country}</span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {article.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                {article.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <span className="text-blue-400 font-semibold text-sm">{article.price}</span>
                  <span className="text-gray-500 text-sm">• {article.data}</span>
                </div>
                <button
                  onClick={() => handleBuy(article)}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Купить →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TravelArticles;

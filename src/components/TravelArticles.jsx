'use client';

import React from 'react';

const TravelArticles = () => {
  const articles = [
    {
      image: 'https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=600',
      country: 'Турция',
      flag: '🇹🇷',
      title: 'Интернет в Турции: как оставаться на связи',
      excerpt: 'Анталия, Стамбул, Каппадокия — Турция входит в топ-3 направлений для россиян. Местные SIM-карты требуют регистрации паспорта, а роуминг стоит от 500₽/день. С eSIM — от 273₽ за весь отпуск.',
      price: 'от 273₽',
      data: '1-20 ГБ'
    },
    {
      image: 'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&w=600',
      country: 'Таиланд',
      flag: '🇹🇭',
      title: 'eSIM для Таиланда: интернет без очередей',
      excerpt: 'Бангкок, Пхукет, Самуи — не тратьте время на поиск SIM-карты в аэропорту. Установите eSIM ещё в самолёте и выходите на связь сразу после посадки. Покрытие по всей стране.',
      price: 'от 273₽',
      data: '1-20 ГБ'
    },
    {
      image: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=600',
      country: 'ОАЭ',
      flag: '🇦🇪',
      title: 'Дубай и Абу-Даби: мобильный интернет для туристов',
      excerpt: 'В ОАЭ заблокированы многие VoIP-сервисы, но мобильный интернет работает отлично. С eSIM вы получите быстрый 4G/5G интернет для навигации, соцсетей и мессенджеров.',
      price: 'от 273₽',
      data: '1-20 ГБ'
    }
  ];

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
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="Поиск"]') || document.querySelector('input[type="text"]');
                    if (input) {
                      input.value = article.country;
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                      nativeSet.call(input, article.country);
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
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

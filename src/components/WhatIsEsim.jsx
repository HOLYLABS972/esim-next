'use client';

import React from 'react';

const WhatIsEsim = () => {
  const steps = [
    {
      icon: '📱',
      title: 'Выберите тариф',
      desc: 'Выберите страну и подходящий тариф с нужным объёмом данных'
    },
    {
      icon: '💳',
      title: 'Оплатите',
      desc: 'Безопасная оплата через Робокассу — карты, СБП, электронные кошельки'
    },
    {
      icon: '📲',
      title: 'Установите eSIM',
      desc: 'Отсканируйте QR-код — eSIM установится за 2 минуты'
    },
    {
      icon: '🌍',
      title: 'Пользуйтесь',
      desc: 'Включите eSIM по прибытии и пользуйтесь интернетом без роуминга'
    }
  ];

  return (
    <div id="what-is-esim" className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Что такое eSIM?
        </h2>
        <p className="text-gray-400 text-lg max-w-3xl mx-auto">
          eSIM — это встроенная цифровая SIM-карта в вашем телефоне. Не нужно покупать физическую SIM-карту, 
          стоять в очередях в аэропорту или переплачивать за роуминг. Просто отсканируйте QR-код — и вы на связи.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {steps.map((step, i) => (
          <div key={i} className="bg-gray-800/90 backdrop-blur-md rounded-xl border border-gray-700/50 p-6 text-center hover:border-blue-400/50 transition-all duration-300">
            <div className="text-4xl mb-4">{step.icon}</div>
            <div className="text-sm text-blue-400 font-semibold mb-2">Шаг {i + 1}</div>
            <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
            <p className="text-gray-400 text-sm">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800/90 backdrop-blur-md rounded-xl border border-gray-700/50 p-8">
        <h3 className="text-2xl font-bold text-white mb-6">Преимущества eSIM</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="text-2xl">⚡</div>
            <div>
              <h4 className="text-white font-semibold mb-1">Мгновенная активация</h4>
              <p className="text-gray-400 text-sm">Получите eSIM на email за секунды после оплаты. Установка занимает 2 минуты.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-2xl">💰</div>
            <div>
              <h4 className="text-white font-semibold mb-1">Дешевле роуминга</h4>
              <p className="text-gray-400 text-sm">Экономьте до 90% по сравнению с роумингом вашего оператора.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-2xl">🔒</div>
            <div>
              <h4 className="text-white font-semibold mb-1">Ваш номер остаётся</h4>
              <p className="text-gray-400 text-sm">eSIM работает как второй номер. Ваша основная SIM-карта продолжает принимать звонки и SMS.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-2xl">🌐</div>
            <div>
              <h4 className="text-white font-semibold mb-1">210+ стран</h4>
              <p className="text-gray-400 text-sm">Покрытие по всему миру. Один QR-код — и вы на связи в любой точке планеты.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatIsEsim;

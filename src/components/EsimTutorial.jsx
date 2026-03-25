'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const EsimTutorial = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  const faqItems = [
    {
      category: 'Установка eSIM',
      questions: [
        {
          q: 'Как установить eSIM на iPhone?',
          a: '1. Откройте Настройки → Сотовая связь → Добавить тариф\n2. Отсканируйте QR-код, который пришёл на email\n3. Нажмите «Далее» и дождитесь активации\n4. Выберите «Вторичный» как линию для мобильных данных\n5. Включите «Переключение сотовых данных» для автоматического переключения\n\nВажно: устанавливайте eSIM до вылета, пока есть Wi-Fi!'
        },
        {
          q: 'Как установить eSIM на Android (Samsung, Google Pixel)?',
          a: '1. Откройте Настройки → Подключения → Диспетчер SIM-карт\n2. Нажмите «Добавить мобильный тариф»\n3. Отсканируйте QR-код из email\n4. Подтвердите установку и дождитесь загрузки профиля\n5. Включите новый тариф для мобильных данных\n\nНа Google Pixel: Настройки → Сеть и интернет → SIM-карты → Добавить SIM'
        },
        {
          q: 'Когда лучше установить eSIM — до или после вылета?',
          a: 'Рекомендуем установить eSIM до вылета, пока у вас есть стабильный интернет (Wi-Fi). Активировать передачу данных нужно уже по прибытии в страну назначения. Большинство eSIM действуют с момента первого подключения к сети.'
        }
      ]
    },
    {
      category: 'Использование',
      questions: [
        {
          q: 'Могу ли я сохранить свой номер телефона?',
          a: 'Да! eSIM работает как вторая SIM-карта. Ваш основной номер продолжает работать — вы сможете принимать звонки и SMS. eSIM используется только для мобильного интернета.'
        },
        {
          q: 'Можно ли делиться интернетом (точка доступа)?',
          a: 'Да, большинство наших тарифов поддерживают раздачу интернета (хотспот). Вы можете подключить ноутбук, планшет или телефон попутчика.'
        },
        {
          q: 'Что делать, если eSIM не подключается?',
          a: '1. Убедитесь, что включена передача данных для eSIM\n2. Включите и выключите авиарежим\n3. Перезагрузите телефон\n4. Проверьте, что выбрана правильная сеть (автоматический выбор)\n5. Если ничего не помогает — напишите в нашу поддержку в Telegram'
        },
        {
          q: 'Можно ли пополнить или продлить тариф?',
          a: 'Некоторые тарифы поддерживают пополнение. Если трафик закончился — просто купите новый тариф для этой же страны. Старую eSIM можно удалить и установить новую.'
        }
      ]
    },
    {
      category: 'Оплата и доставка',
      questions: [
        {
          q: 'Как происходит оплата?',
          a: 'Мы принимаем оплату через Робокассу — банковские карты (Visa, MasterCard, МИР), СБП, электронные кошельки. Оплата проходит мгновенно и безопасно.'
        },
        {
          q: 'Как быстро я получу eSIM?',
          a: 'QR-код приходит на вашу почту автоматически в течение 1-2 минут после оплаты. Проверьте папку «Спам», если письмо не пришло. Также QR-код отображается в вашем личном кабинете.'
        },
        {
          q: 'Можно ли вернуть деньги?',
          a: 'Если eSIM не была активирована (QR-код не отсканирован), мы вернём деньги в полном объёме. Для возврата свяжитесь с поддержкой в Telegram.'
        }
      ]
    }
  ];

  let globalIdx = 0;

  return (
    <div id="faq" className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Частые вопросы
        </h2>
        <p className="text-gray-400 text-lg">
          Всё, что нужно знать об eSIM — установка, использование, оплата
        </p>
      </div>

      {faqItems.map((cat, ci) => (
        <div key={ci} className="mb-8">
          <h3 className="text-xl font-semibold text-blue-400 mb-4">{cat.category}</h3>
          <div className="space-y-3">
            {cat.questions.map((item, qi) => {
              const idx = globalIdx++;
              const isOpen = openIndex === idx;
              return (
                <div key={qi} className="bg-gray-800/90 backdrop-blur-md rounded-lg border border-gray-700/50 overflow-hidden">
                  <button
                    onClick={() => toggle(idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                  >
                    <span className="text-white font-medium pr-4">{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 border-t border-gray-700/30">
                      <p className="text-gray-300 pt-4 leading-relaxed whitespace-pre-line">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-12 text-center p-8 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/30">
        <h3 className="text-xl font-semibold text-white mb-4">Остались вопросы?</h3>
        <p className="text-gray-400 mb-6">Наша команда поддержки готова помочь в Telegram</p>
        <a
          href="https://t.me/holylabsltd"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          ✈️ Написать в поддержку
        </a>
      </div>
    </div>
  );
};

export default EsimTutorial;

'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyRu() {
  const currentDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Политика Конфиденциальности</h1>
          <p className="text-gray-600">Holylabs Ltd - RoamJet</p>
          <p className="text-sm text-gray-500 mt-2">Последнее обновление: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Basic Info */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Основная Информация</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs Ltd ("Holylabs", "мы", "нас" или "наш") - это зарегистрированная в Великобритании компания, которая признает важность вашей конфиденциальности.
              </p>
              <p>
                Среди своей различной деятельности Holylabs может получать данные или личную информацию от своих клиентов или пользователей. Цель этой Политики конфиденциальности - объяснить разрешенное использование этих данных и объяснить и предоставить пользователям и клиентам RoamJet информацию о том, какие данные хранит Holylabs, и какие варианты у пользователей и клиентов есть в отношении этих данных.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Ключевые Моменты:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Мы НЕ обрабатываем и не храним никакой личной информации, которую мы не получили напрямую от субъекта.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Мы минимизируем запрашиваемые и хранимые личные данные насколько это возможно.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Вы всегда можете связаться с нами и запросить, чтобы мы поделились с вами имеющимися у нас данными и удалили такие данные (если они есть).</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Все услуги Holylabs ограничены возрастом 18 лет. В случае использования младше этого возраста необходимо получить согласие родителей.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Введение</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Мы уважаем вашу конфиденциальность и стремимся защитить ее, соблюдая эту политику конфиденциальности ("Политика"). Эта Политика описывает типы информации, которую мы можем собирать у вас или которую вы можете предоставить ("Личная информация") в мобильном приложении "RoamJet" и на веб-сайте (roamjet.net) ("Мобильное приложение", "Веб-сайт" или "Сервис") и любых связанных с ним продуктах и услугах (совместно "Сервисы"), а также наши практики по сбору, использованию, поддержанию, защите и раскрытию этой личной информации.
              </p>
            </div>
          </section>

          {/* Personal Information Collection */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Сбор Личной Информации</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                При регистрации в сервисах RoamJet вас просят предоставить следующую информацию:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ваше имя</li>
                <li>Адрес электронной почты</li>
                <li>Платежная информация</li>
              </ul>
              <p>
                Мы храним эту информацию и используем ее для работы сервиса, выставления счетов и внутренних целей. <strong>Такая информация НЕ передается третьим лицам</strong>, за исключением целей обработки платежей через безопасные платежные шлюзы.
              </p>
              <p>
                Если у вас есть какие-либо вопросы относительно хранимой нами информации или по любому вопросу конфиденциальности, не стесняйтесь обращаться к нашей команде по электронной почте: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Ваши Права</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                В зависимости от вашего местоположения и применимого законодательства, у вас могут быть следующие права в отношении вашей личной информации:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Право на доступ:</strong> Вы имеете право запросить копии ваших личных данных.</li>
                <li><strong>Право на исправление:</strong> Вы имеете право запросить исправление любой информации, которую вы считаете неточной, или дополнить информацию, которую вы считаете неполной.</li>
                <li><strong>Право на удаление:</strong> Вы имеете право запросить удаление ваших личных данных при определенных условиях.</li>
                <li><strong>Право на ограничение обработки:</strong> Вы имеете право запросить ограничение обработки ваших личных данных при определенных условиях.</li>
              </ul>
              <p>
                Чтобы воспользоваться любым из этих прав, свяжитесь с нами по адресу <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>. Мы ответим на ваш запрос в течение 30 дней.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Связаться с Нами</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Если у вас есть какие-либо вопросы об этой Политике конфиденциальности или наших практиках, свяжитесь с нами:
              </p>
              <p>
                Электронная почта: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Back to Home */}
          <div className="pt-8 border-t border-gray-200">
            <Link 
              href="/ru" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Вернуться на Главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

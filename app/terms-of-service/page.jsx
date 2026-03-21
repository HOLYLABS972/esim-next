'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfServiceRu() {
  const currentDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Условия Использования</h1>
          <p className="text-gray-600">RoamJet by Holylabs Ltd</p>
          <p className="text-sm text-gray-500 mt-2">Последнее обновление: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Введение</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                RoamJet - это продукт Holylabs Ltd ("Holylabs"). Holylabs, ее сотрудники, менеджеры и владельцы рады, что вы выбрали использование RoamJet.
              </p>
              <p>
                Используя RoamJet (включая любое использование приложения, веб-сайта (roamjet.net), данных, текстов, изображений, видео, стилей дизайна, компьютерного кода и мобильного кода RoamJet, или любое использование услуг, предлагаемых на RoamJet, включая, помимо прочего, использование eSIM) ("RoamJet"), вы соглашаетесь соблюдать эти условия использования ("Условия"). Если вы не согласны с Условиями, не используйте RoamJet.
              </p>
              <p className="font-semibold">
                Эти Условия влияют на ваши законные права и обязанности. Если вы не согласны соблюдать все Условия, не получайте доступ и не используйте RoamJet.
              </p>
            </div>
          </section>

          {/* Main Operation Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Основные Операционные Рекомендации и Политика Возврата</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex">
                <span className="font-semibold mr-2">1.</span>
                <p>При установке и активации eSIM вы должны действовать точно в соответствии с инструкциями в приложении и на веб-сайте. Возврат средств не будет произведен за пакет, который не был активирован из-за несоблюдения инструкций.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">2.</span>
                <p>Не удаляйте/не убирайте eSIM с устройства после его установки. Кредит/возврат средств не будет предоставлен, если eSIM будет удален.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">3.</span>
                <p>Нет возврата средств за неиспользованные данные.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">4.</span>
                <p>Перед покупкой пользователь должен убедиться, что устройство поддерживает eSIM и разблокировано.</p>
              </div>
            </div>
          </section>

          {/* Using RoamJet */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Использование RoamJet</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Приложение, сервис, контент, данные и информация, отображаемые или отправляемые RoamJet, предоставляются "как есть", "по мере доступности" и "со всеми ошибками". Вы, как пользователь, не будете иметь никаких требований, юридических претензий или других претензий относительно качества данных, ошибок в данных, искажения (включая искажение в отношении доступных eSIM, уровня обслуживания в конкретной стране, видео, ценообразования и т.д.) или любой ошибки любого рода.
              </p>
              <p>
                Мы в Holylabs сделаем все возможное, чтобы предоставить вам высококачественные услуги. Однако Holylabs не гарантирует и не может гарантировать, что услуги eSIM не будут иметь простоев, не будут прерваны или будут безошибочными.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Интеллектуальная Собственность и Авторские Права</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Вся интеллектуальная собственность и авторские права в отношении RoamJet, включая приложение, дизайн, компьютерный код, графику, изображения, структуру приложения, сайта и кода, а также любой другой компонент в RoamJet, принадлежат только Holylabs. Запрещается копировать, распространять, воспроизводить, публично демонстрировать или раскрывать третьим лицам любую часть этого защищенного материала без предварительного письменного согласия Holylabs.
              </p>
            </div>
          </section>

          {/* General Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Общие Положения</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs оставляет за собой право подать в суд на любого пользователя за любой ущерб, вред, убытки или будущую потерю прибыли. Например, такой ущерб может быть причинен фиктивным использованием приложения, атакой или перегрузкой серверов, копированием данных и/или информации из RoamJet для коммерческого использования или любым другим неразрешенным использованием.
              </p>
              <p>
                Эти Условия регулируются законами Англии и Уэльса. Любой судебный процесс между пользователем и Holylabs будет проходить в компетентных судах в Лондоне, Великобритания.
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

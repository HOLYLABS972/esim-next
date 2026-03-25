'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';

const SUPPORT_TELEGRAM = 'https://t.me/holylabsltd';
const SUPPORT_EMAIL = 'dima@holylabs.net';

// Replace known brand names in text with current brand name
function applyBrandName(text, brandName) {
  if (!text || typeof text !== 'string' || !brandName) return text;
  return text
    .replace(/\{\{brandName\}\}/g, brandName)
    .replace(/\bGlobalBanka\b/g, brandName)
    .replace(/\bRoamJet\b/g, brandName);
}

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowContactMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const { t, translations } = useI18n();
  const { brand } = useBrand();
  const brandName = brand?.name || 'RoamJet';
  const supportTelegram = SUPPORT_TELEGRAM;

  const faqPage = translations?.faqPage;
  const title = faqPage?.title ?? 'Часто задаваемые вопросы';
  const description = faqPage?.description ?? 'Найдите быстрые ответы на общие вопросы о наших услугах eSIM';
  const categories = faqPage?.categories ?? [];
  const stillQuestions = faqPage?.stillQuestions ?? 'Still have questions?';
  const contactSupportText = faqPage?.contactSupportText ?? "Can't find the answer? Our support team is here to help.";
  const contactSupport = faqPage?.contactSupport ?? 'Contact Support';

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          {description}
        </p>
      </div>

      {categories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-8">
          <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">
            {category.category}
          </h3>

          <div className="space-y-3">
            {category.questions?.map((item, questionIndex) => {
              const globalIndex = `${categoryIndex}-${questionIndex}`;
              const isOpen = openIndex === globalIndex;

              return (
                <div
                  key={questionIndex}
                  className="bg-gray-100 dark:bg-gray-800/90 backdrop-blur-md rounded-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleQuestion(globalIndex)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <span className="text-gray-900 dark:text-white font-medium pr-4">
                      {applyBrandName(item.q, brandName)}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-4 border-t border-gray-200 dark:border-gray-700/30">
                      <p className="text-gray-600 dark:text-gray-300 pt-4 leading-relaxed">
                        {applyBrandName(item.a, brandName)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-12 text-center p-8 bg-gray-100 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700/30">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {stillQuestions}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {contactSupportText}
        </p>
        <div className="relative inline-block" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowContactMenu(!showContactMenu); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            <Mail size={18} />
            {contactSupport}
          </button>
          {showContactMenu && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xl">📧</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Email</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{SUPPORT_EMAIL}</div>
                </div>
              </a>
              <a
                href={SUPPORT_TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xl">✈️</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Telegram</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">@holylabsltd</div>
                </div>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQ;

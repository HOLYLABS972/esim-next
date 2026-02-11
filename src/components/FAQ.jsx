'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';

const SUPPORT_EMAIL = 'support@roamjet.net';

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
  const { t, translations } = useI18n();
  const { brand } = useBrand();
  const brandName = brand?.name || 'RoamJet';
  const supportEmail = SUPPORT_EMAIL;

  const faqPage = translations?.faqPage;
  const title = faqPage?.title ?? t('contact.faqTitle', 'Frequently Asked Questions');
  const description = faqPage?.description ?? t('contact.faqDescription', 'Find quick answers to common questions about our eSIM services');
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
        <a
          href={`mailto:${supportEmail}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
        >
          {contactSupport}
        </a>
      </div>
    </div>
  );
};

export default FAQ;

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '../contexts/I18nContext';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export default function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, changeLanguage } = useI18n();

  const handleLanguageChange = (langCode) => {
    // Change language in context
    changeLanguage(langCode);

    // Update URL
    const pathWithoutLang = pathname.replace(/^\/(ar|de|es|fr|he|ru)/, '');
    const newPath = langCode === 'en' ? pathWithoutLang || '/' : `/${langCode}${pathWithoutLang || '/'}`;
    router.push(newPath);
  };

  const currentLanguage = languages.find(lang => lang.code === (locale || 'en')) || languages[0];

  return (
    <div className="relative group">
      <button className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
        {currentLanguage.flag} {currentLanguage.name}
      </button>
      
      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                locale === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


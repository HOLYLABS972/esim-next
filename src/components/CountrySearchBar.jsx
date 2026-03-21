'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '../contexts/I18nContext';
import smartCountryService from '../services/smartCountryService';
import { X } from 'lucide-react';

const CountrySearchBar = ({ onSearch, showCountryCount = true }) => {
  const { t, locale: contextLocale } = useI18n();
  // Force Russian locale for main page
  const locale = 'ru';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState('');
  const isInitialMount = useRef(true);
  
  // Check if current locale is RTL
  const isRTL = locale === 'ar' || locale === 'he';
  
  // Preload full countries in background (for search functionality)
  useEffect(() => {
    smartCountryService.preloadCountries();
  }, []);

  // Read search parameter from URL and populate input (only on mount or URL change, not on every state change)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    
    // Only update from URL if it's different and we're not in the middle of typing
    // Skip on initial mount if there's no URL search (to avoid clearing user input)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (urlSearch) {
        setSearchValue(urlSearch);
      }
    } else if (urlSearch !== searchValue) {
      // Only sync from URL if user hasn't typed something different
      // This allows URL changes (like back button) to update the input
      setSearchValue(urlSearch);
    }
  }, [searchParams]); // Removed searchValue from dependencies to prevent loop

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (searchValue.trim()) {
      // Keep Russian search term in URL - search function will handle it
      const searchUrl = `/?search=${encodeURIComponent(searchValue.trim())}`;
      router.push(searchUrl);
      
      // Also call onSearch callback if provided (pass Russian term, search will handle translation)
      if (onSearch) {
        onSearch(searchValue.trim());
      }
    } else {
      // Navigate to main page without search param
      router.push('/');
    }
  };

  const handleInputChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const handleClear = () => {
    setSearchValue('');
    router.push('/');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative group">
          <input
            type="text"
            value={searchValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Поиск страны"
            className={`w-full px-6 py-4 sm:py-5 pr-12 text-base sm:text-lg text-white bg-gray-800/90 backdrop-blur-md border-2 border-gray-700 rounded-full focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300 shadow-lg hover:shadow-xl placeholder:text-gray-500 placeholder:font-medium ${isRTL ? 'text-right' : 'text-left'}`}
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
              aria-label="Очистить поиск"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CountrySearchBar;

'use client';

import React from 'react';
import { Wifi, Clock, Check } from 'lucide-react';
import { formatPriceFromItem } from '../services/currencyService';

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode) => {
  if (!countryCode) return '🌍';
  
  // Handle global and regional plans
  if (countryCode === 'GLOBAL') return '🌍';
  if (countryCode === 'REGIONAL') return '🌐';
  if (countryCode === 'EUROPE') return '🇪🇺';
  if (countryCode === 'ASIA') return '🌏';
  if (countryCode === 'AMERICAS') return '🌎';
  if (countryCode === 'AFRICA') return '🌍';
  
  // Handle special cases like PT-MA, multi-region codes, etc.
  if (countryCode.includes('-') || countryCode.length > 2) {
    return '🌍';
  }
  
  // Handle regular country codes
  if (countryCode.length !== 2) return '🌍';
  
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    console.warn('Invalid country code: ' + countryCode, error);
    return '🌍';
  }
};

const formatValidity = (validity) => {
  // Convert "X day(s)" → "X день/дня/дней" for Russian
  const m = validity?.toString().trim()?.match(/^(\d+)\s*days?$/i);
  if (m) {
    const days = Number(m[1]);
    const mod10 = days % 10;
    const mod100 = days % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${days} дней`;
    if (mod10 === 1) return `${days} день`;
    if (mod10 >= 2 && mod10 <= 4) return `${days} дня`;
    return `${days} дней`;
  }
  return validity;
};

const formatData = (data) => {
  const normalized = (data || '').toString().trim().toLowerCase();
  if (normalized === 'unlimited' || normalized === 'безлимит' || normalized === '-1') {
    return '∞ Безлимит';
  }

  // Handle cases where data might already contain the unit
  if (typeof data === 'string' && (data.includes('GB') || data.includes('MB') || data.includes('ГБ') || data.includes('МБ'))) {
    return data.replace(/\bGB\b/g, 'ГБ').replace(/\bMB\b/g, 'МБ');
  }

  return data;
};

const TopupPackageCard = ({ package: pkg, isSelected, onSelect, showSlug = false }) => {
  if (!pkg) return null;

  const countryCode = pkg.country_code ? pkg.country_code.toString().toUpperCase() : '';
  const countryFlag = countryCode ? getFlagEmoji(countryCode) : '';
  const countryText = (pkg.country_name || countryCode || '').toString().trim();
  const slugText = (pkg.airaloSlug || pkg.slug || '').toString().trim();

  // Format price for display - use RUB as primary currency
  const priceRub = Math.round(pkg.price_rub || (pkg.price * 95));

  return (
    <div
      onClick={onSelect}
      className={`
        relative cursor-pointer rounded-xl p-4 mb-4 transition-all duration-200 border-2
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-400 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`${pkg.name}, Данные: ${formatData(pkg.data)}, Срок: ${formatValidity(pkg.validity)}, Цена: ${priceRub} ₽`}
      aria-pressed={isSelected}
    >
      {/* Package Name */}
      <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {pkg.name}
      </h3>

      {/* Country */}
      {countryText && (
        <div className="flex items-center gap-2 mb-2">
          {countryFlag && <span className="text-md">{countryFlag}</span>}
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
            {countryText}
          </span>
        </div>
      )}

      {/* Slug (debug) - only show when selected for debugging */}
      {showSlug && isSelected && slugText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded break-all">
          {slugText}
        </p>
      )}

      {/* Country Codes (if multi-country) */}
      {pkg.country_codes && pkg.country_codes.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {pkg.country_codes.slice(0, 3).map((code, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
            >
              {code}
            </span>
          ))}
          {pkg.country_codes.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
              +{pkg.country_codes.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Data and Validity */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Данные</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatData(pkg.data)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Срок</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatValidity(pkg.validity)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-center">
        <span className={`text-xl font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
          {priceRub} ₽
        </span>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

export default TopupPackageCard;
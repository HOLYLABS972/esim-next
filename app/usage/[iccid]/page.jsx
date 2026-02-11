'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Phone, MessageSquare, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Russian translations for status labels
const STATUS_LABELS = {
  NOT_ACTIVE: 'Не активирован',
  ACTIVE: 'Активен',
  FINISHED: 'Израсходован',
  EXPIRED: 'Истёк',
  UNKNOWN: 'Неизвестно',
  RECYCLED: 'Переработан',
};

// Format usage data functions (adapted from mobile)
function formatUsedData(usedMB, isUnlimited) {
  if (isUnlimited) return 'Безлимит';
  if (usedMB >= 1024) return `${(usedMB / 1024).toFixed(1)} ГБ`;
  return `${Math.round(usedMB)} МБ`;
}

function formatTotalData(totalMB, isUnlimited) {
  if (isUnlimited) return 'Безлимит';
  if (totalMB >= 1024) return `${Math.round(totalMB / 1024)} ГБ`;
  return `${Math.round(totalMB)} МБ`;
}

function getUsagePercentage(usedMB, totalMB, isUnlimited) {
  if (isUnlimited || totalMB === 0) return 0;
  return Math.min(100, Math.round((usedMB / totalMB) * 100));
}

function formatVoiceUsage(minutes) {
  if (minutes === 0) return '0 мин';
  if (minutes < 60) return `${Math.round(minutes)} мин`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 час' : hours < 5 ? `${hours} часа` : `${hours} часов`;
  }
  return `${hours} ч ${remainingMinutes} мин`;
}

function formatTextUsage(smsCount) {
  if (smsCount === 0) return '0 SMS';
  if (smsCount === 1) return '1 SMS';
  return `${smsCount} SMS`;
}

function formatDaysRemaining(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'Сегодня';
  if (days === 1) return '1 день';
  if (days >= 2 && days <= 4) return `${days} дня`;
  return `${days} дней`;
}

function formatExpiryDate(expiresAt) {
  if (!expiresAt) return '—';
  const date = new Date(expiresAt);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getVoicePercentage(usedMinutes, totalMinutes) {
  if (totalMinutes === 0) return 0;
  return Math.min(100, Math.round((usedMinutes / totalMinutes) * 100));
}

function getTextPercentage(usedSms, totalSms) {
  if (totalSms === 0) return 0;
  return Math.min(100, Math.round((usedSms / totalSms) * 100));
}

function needsAttention(status) {
  return status === 'EXPIRED' || status === 'FINISHED' || status === 'RECYCLED';
}

function getStatusColor(status) {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-500';
    case 'EXPIRED':
      return 'text-red-500';
    case 'FINISHED':
      return 'text-yellow-500';
    case 'NOT_ACTIVE':
      return 'text-gray-500';
    case 'RECYCLED':
      return 'text-red-500';
    case 'UNKNOWN':
    default:
      return 'text-gray-400';
  }
}

export default function UsagePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { iccid } = params;
  
  // URL parameters for plan info
  const planDataMB = searchParams.get('planDataMB');
  const planValidityDays = searchParams.get('planValidityDays');
  const planUnlimited = searchParams.get('planUnlimited');
  const country = searchParams.get('country');

  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsageData = async () => {
    if (!iccid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/esim/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iccid }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch usage data');
      }

      const apiData = result.data.data;
      
      // Calculate days remaining from expiry date
      let daysRemaining = null;
      if (apiData.expired_at) {
        const expiresAt = new Date(apiData.expired_at);
        const now = new Date();
        daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      // Convert bytes to MB
      const totalMB = apiData.total / (1024 * 1024);
      const remainingMB = apiData.remaining / (1024 * 1024);
      const usedMB = Math.max(0, totalMB - remainingMB);

      // Voice and text usage
      const totalVoice = apiData.total_voice ?? 0;
      const remainingVoice = apiData.remaining_voice ?? 0;
      const usedVoice = Math.max(0, totalVoice - remainingVoice);
      const hasVoice = totalVoice > 0;

      const totalText = apiData.total_text ?? 0;
      const remainingText = apiData.remaining_text ?? 0;
      const usedText = Math.max(0, totalText - remainingText);
      const hasText = totalText > 0;

      // Use plan data if API returns 0/0 (before activation)
      const finalTotalMB = totalMB === 0 && planDataMB ? Number(planDataMB) : totalMB;
      const isUnlimited = apiData.is_unlimited === true || planUnlimited === '1';

      const processedData = {
        totalMB: finalTotalMB,
        usedMB,
        remainingMB,
        isUnlimited,
        totalVoice,
        usedVoice,
        remainingVoice,
        hasVoice,
        totalText,
        usedText,
        remainingText,
        hasText,
        status: apiData.status?.toUpperCase() || 'UNKNOWN',
        expiresAt: apiData.expired_at,
        daysRemaining,
        validityDays: planValidityDays ? Number(planValidityDays) : null,
      };

      setUsageData(processedData);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [iccid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header with back button */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Использование данных</h1>
          </div>

          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Загрузка данных...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !usageData) {
    const isApiNotReady = error?.includes('not available');
    
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header with back button */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">{isApiNotReady ? 'Скоро' : 'Ошибка'}</h1>
          </div>

          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md mx-auto">
              <p className={`text-lg mb-4 ${isApiNotReady ? 'text-gray-400' : 'text-red-500'}`}>
                {isApiNotReady ? 'Функция в разработке' : 'Не удалось загрузить данные'}
              </p>
              <p className="text-gray-400 mb-6">
                {isApiNotReady
                  ? 'Отслеживание использования данных скоро будет доступно'
                  : 'Попробуйте позже'}
              </p>
              {!isApiNotReady && (
                <button
                  onClick={fetchUsageData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg mb-4 transition-colors inline-flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Повторить</span>
                </button>
              )}
              <div>
                <button
                  onClick={() => router.back()}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Назад
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const percentage = getUsagePercentage(usageData.usedMB, usageData.totalMB, usageData.isUnlimited);
  const voicePercentage = getVoicePercentage(usageData.usedVoice, usageData.totalVoice);
  const textPercentage = getTextPercentage(usageData.usedText, usageData.totalText);
  const statusColor = getStatusColor(usageData.status);
  const showWarning = needsAttention(usageData.status);

  const circumference = 2 * Math.PI * 80; // radius = 80
  const strokeDasharray = circumference;
  const strokeDashoffset = usageData.isUnlimited ? 0 : circumference - (percentage / 100) * circumference;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Использование данных</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Warning banner */}
          {showWarning && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-center"
            >
              <p className="text-red-400 font-medium">
                {usageData.status === 'EXPIRED' && 'Срок действия eSIM истёк'}
                {usageData.status === 'FINISHED' && 'Трафик eSIM исчерпан'}
                {usageData.status === 'RECYCLED' && 'eSIM деактивирован'}
              </p>
            </motion.div>
          )}

          {/* Circular Progress */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="relative inline-block">
              <svg width="200" height="200" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="rgb(55 65 81)" // gray-700
                  strokeWidth="12"
                />
                {/* Progress circle */}
                {!usageData.isUnlimited && (
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={percentage > 80 ? "rgb(245 158 11)" : "rgb(59 130 246)"} // amber-500 or blue-500
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                )}
              </svg>
              
              {/* Content inside circle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {usageData.isUnlimited ? (
                  <>
                    <div className="text-5xl font-light text-green-500 mb-1">∞</div>
                    <div className="text-sm text-gray-400">Безлимит</div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-1">
                      {formatUsedData(usageData.usedMB, false)}
                    </div>
                    <div className="text-sm text-gray-400">
                      из {formatTotalData(usageData.totalMB, false)}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {!usageData.isUnlimited && (
              <div className={`mt-4 text-lg font-medium ${percentage > 80 ? 'text-yellow-500' : 'text-blue-500'}`}>
                {percentage}% использовано
              </div>
            )}
          </motion.div>

          {/* Voice & SMS Usage Cards */}
          {(usageData.hasVoice || usageData.hasText) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Voice Usage */}
              {usageData.hasVoice && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Phone className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Звонки</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {formatVoiceUsage(usageData.remainingVoice)}
                  </div>
                  <div className="text-sm text-gray-400 mb-3">
                    из {formatVoiceUsage(usageData.totalVoice)}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                        voicePercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${100 - voicePercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* SMS Usage */}
              {usageData.hasText && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold">SMS</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {formatTextUsage(usageData.remainingText)}
                  </div>
                  <div className="text-sm text-gray-400 mb-3">
                    из {formatTextUsage(usageData.totalText)}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                        textPercentage > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${100 - textPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Status Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 border border-gray-700 rounded-xl p-6"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Статус</span>
                <span className={`font-semibold px-3 py-1 rounded-lg text-sm ${statusColor} bg-opacity-20`}>
                  {STATUS_LABELS[usageData.status] || usageData.status}
                </span>
              </div>
              
              <hr className="border-gray-700" />
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Истекает</span>
                <span>{formatExpiryDate(usageData.expiresAt)}</span>
              </div>
              
              <hr className="border-gray-700" />
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Осталось дней</span>
                <span>{formatDaysRemaining(usageData.daysRemaining)}</span>
              </div>
            </div>
          </motion.div>

          {/* ICCID Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 border border-gray-700 rounded-xl p-6"
          >
            <div className="text-sm text-gray-400 mb-2">ICCID</div>
            <div className="font-mono text-lg">{iccid}</div>
          </motion.div>

          {/* Topup Button */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <Link
              href={`/topup/${iccid}${country ? `?country=${country}` : ''}`}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Пополнить</span>
              <ExternalLink className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
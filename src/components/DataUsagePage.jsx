'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Signal, Calendar, Database, Activity, AlertCircle } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

const DataUsagePage = ({ iccid, orderId }) => {
  const router = useRouter();
  const { t, locale, isLoading: translationsLoading, translations } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataInfo, setDataInfo] = useState(null);

  // Debug: Log translation status
  useEffect(() => {
    console.log('🌐 DataUsagePage translation status:', {
      locale,
      translationsLoading,
      hasTranslations: !!translations,
      hasDataUsageKey: !!(translations?.dashboard?.dataUsage)
    });
  }, [locale, translationsLoading, translations]);

  const fetchDataUsage = async () => {
    try {
      setLoading(true);

      // Detect if iccid parameter is actually an orderId (13+ digits) but NOT an ICCID (starts with 8985)
      let actualIccid = iccid;
      let actualOrderId = orderId;

      // ICCIDs start with 8985 and are 19-20 digits
      const isIccid = iccid && /^8985\d{15,16}$/.test(iccid);

      // If iccid looks like an orderId (doesn't start with 8985) and no orderId provided
      if (iccid && !orderId && !isIccid && /^\d{13,}$/.test(iccid)) {
        actualOrderId = iccid;
        actualIccid = null;
      }

      // Call Next.js API route directly (no auth required)
      const response = await fetch('/api/user/mobile-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccid: actualIccid, orderId: actualOrderId }),
      });

      const result = await response.json();

      if (result.success) {
        setDataInfo(result.data);
      } else {
        setError(result.error || 'Failed to fetch data usage');
      }
    } catch (err) {
      console.error('Error fetching data usage:', err);
      setError(err.message || 'Failed to fetch data usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iccid, orderId]);

  const getUsagePercentage = () => {
    if (dataInfo?.usagePercentage) return dataInfo.usagePercentage;
    
    // If dataUsed is N/A or 0, return 0
    const used = dataInfo?.dataUsed || '0MB';
    if (used === 'N/A' || used === '0 MB' || used === '0MB') return 0;
    
    // Try to calculate from dataUsed and dataTotal
    const total = dataInfo?.dataTotal || '0MB';
    
    // Extract numbers from strings like "1 GB", "500 MB", etc.
    const usedMatch = used.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i);
    const totalMatch = total.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i);
    
    if (!usedMatch || !totalMatch) return 0;
    
    // Convert to MB for calculation
    const convertToMB = (value, unit) => {
      const num = parseFloat(value);
      const unitUpper = unit.toUpperCase();
      if (unitUpper === 'GB') return num * 1024;
      if (unitUpper === 'TB') return num * 1024 * 1024;
      return num; // MB
    };
    
    const usedMB = convertToMB(usedMatch[1], usedMatch[2]);
    const totalMB = convertToMB(totalMatch[1], totalMatch[2]);
    
    if (totalMB > 0) {
      return Math.round((usedMB / totalMB) * 100);
    }
    
    return 0;
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'active') return 'bg-green-100 text-green-800 border-green-300';
    if (statusLower === 'expired') return 'bg-red-100 text-red-800 border-red-300';
    if (statusLower === 'inactive') return 'bg-gray-100 text-gray-800 border-gray-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  if (loading || translationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('dashboard.dataUsage.loading', 'Loading data usage...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('dashboard.dataUsage.back', 'Back')}
          </button>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.dataUsage.errorLoadingData', 'Error Loading Data')}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => fetchDataUsage()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('dashboard.dataUsage.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('dashboard.dataUsage.back', 'Back')}
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Status Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">{t('dashboard.dataUsage.title', 'Data Usage')}</h1>
            <p className="text-white/90 text-sm break-all">ICCID: {iccid}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Package Name */}
            {dataInfo?.packageName && (
              <div className="text-center pb-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {typeof dataInfo.packageName === 'string' 
                    ? dataInfo.packageName 
                    : dataInfo.packageName?.name || dataInfo.packageName?.title || dataInfo.packageName?.slug || 'eSIM Package'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('dashboard.dataUsage.operator', 'Operator')}: Roamjet
                </p>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Signal className="w-5 h-5 text-gray-600 mr-3" />
                <span className="text-gray-700 font-medium">{t('dashboard.dataUsage.status', 'Status')}</span>
              </div>
              <span className={`px-4 py-1 rounded-full text-sm font-medium border ${getStatusColor(dataInfo?.status)}`}>
                {dataInfo?.status ? t(`dashboard.status.${dataInfo.status.toLowerCase()}`, dataInfo.status) : t('dashboard.unknown', 'Unknown')}
              </span>
            </div>

            {/* Data Usage Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-gray-700 font-medium">{t('dashboard.dataUsage.dataUsage', 'Data Usage')}</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {usagePercentage}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('dashboard.dataUsage.used', 'Used')}: {dataInfo?.dataUsed || 'N/A'}</span>
                <span>{t('dashboard.dataUsage.total', 'Total')}: {dataInfo?.dataTotal || 'N/A'}</span>
              </div>
            </div>

            {/* Remaining Data */}
            {dataInfo?.dataRemaining && dataInfo?.dataRemaining !== 'N/A' && (
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-gray-700 font-medium">
                    {dataInfo?.isUnlimited ? t('dashboard.dataUsage.unlimitedData', 'Unlimited Data') : t('dashboard.dataUsage.dataAvailable', 'Data Available')}
                  </span>
                </div>
                <span className="text-xl font-bold text-green-700">
                  {dataInfo.isUnlimited ? '∞' : dataInfo.dataRemaining}
                </span>
              </div>
            )}

            {/* Days Information */}
            {(dataInfo?.daysUsed > 0 || dataInfo?.daysRemaining > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {dataInfo.daysUsed > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-2">
                      <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm text-gray-600">{t('dashboard.dataUsage.daysUsed', 'Days Used')}</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{dataInfo.daysUsed}</p>
                  </div>
                )}
                
                {dataInfo.daysRemaining > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center mb-2">
                      <Calendar className="w-4 h-4 text-purple-600 mr-2" />
                      <span className="text-sm text-gray-600">{dataInfo.daysUsed > 0 ? t('dashboard.dataUsage.daysRemaining', 'Days Remaining') : t('dashboard.dataUsage.validityDays', 'Validity (Days)')}</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{dataInfo.daysRemaining}</p>
                  </div>
                )}
              </div>
            )}

            {/* Expiry Date */}
            {dataInfo?.expiresAt && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-orange-600 mr-3" />
                    <span className="text-gray-700 font-medium">{t('dashboard.dataUsage.expiresOn', 'Expires On')}</span>
                  </div>
                  <span className="text-gray-900 font-semibold">
                    {new Date(dataInfo.expiresAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Last Updated */}
            {dataInfo?.lastUpdated && (
              <p className="text-xs text-gray-500 text-center">
                {t('dashboard.dataUsage.lastUpdated', 'Last updated')}: {new Date(dataInfo.lastUpdated).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUsagePage;


'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
// import { esimService } from '../services/esimServiceMongo'; // Removed - causes client-side MongoDB errors
import { getLanguageDirection, detectLanguageFromPath } from '../utils/languageUtils';
import { translateCountryName } from '../utils/countryUtils';
import { getCorrectCountryForOrder } from '../utils/planCountryUtils';
import toast from 'react-hot-toast';

// Dashboard Components
import DashboardHeader from './dashboard/DashboardHeader';
import StatsCards from './dashboard/StatsCards';
import RecentOrders from './dashboard/RecentOrders';
import AccountSettings from './dashboard/AccountSettings';
import EsimDetailsModal from './dashboard/EsimDetailsModal';
import EsimUsageModal from './dashboard/EsimUsageModal';
import BottomSheet from './BottomSheet';

const Dashboard = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Direct login via email param - /dashboard?email=...
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam && !currentUser && !authLoading) {
      const decodedEmail = decodeURIComponent(emailParam).toLowerCase().trim();
      
      // Direct login - store in localStorage like Yandex auth
      (async () => {
        try {
          const response = await fetch('/api/auth/login-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: decodedEmail })
          });

          const data = await response.json();

          if (data.success && data.user) {
            // Store in localStorage (like Yandex auth)
            localStorage.setItem('authToken', 'email-login-' + data.user.id);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Trigger auth state change event (like Yandex)
            window.dispatchEvent(new CustomEvent('authStateChanged', { 
              detail: { user: data.user, token: 'email-login-' + data.user.id, action: 'login' } 
            }));

            // Remove email param from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('email');
            window.history.replaceState({}, '', newUrl.pathname);
          }
        } catch (error) {
          console.error('Dashboard login error:', error);
        }
      })();
    }
  }, [searchParams, currentUser, authLoading]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [generatedQRCode, setGeneratedQRCode] = useState(null);
  const [esimDetails, setEsimDetails] = useState(null);
  const [loadingEsimDetails, setLoadingEsimDetails] = useState(false);
  const [esimUsage, setEsimUsage] = useState(null);
  const [loadingEsimUsage, setLoadingEsimUsage] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [appleInstallUrl, setAppleInstallUrl] = useState(null);
  
  const router = useRouter();

  // Get current language for RTL detection
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('roamjet-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);


  const fetchData = useCallback(async () => {
      // Email: prefer currentUser, fallback to localStorage userData (Yandex/OAuth may store there)
      const userEmail = currentUser?.email ?? (typeof window !== 'undefined' && (() => {
        try {
          const raw = localStorage.getItem('userData');
          if (raw) { const u = JSON.parse(raw); return u?.email || u?.user_email || null; }
        } catch (_) {}
        return null;
      })());
      if (!userEmail) {
        setLoading(false);
        setOrders([]);
        return;
      }

      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const userId = currentUser?.uid || currentUser?.id || currentUser?._id || null;
        
        const params = new URLSearchParams();
        params.set('email', userEmail);
        params.set('status', 'active'); // web dashboard: show only active
        if (userId) {
          params.set('userId', String(userId));
        }
        
        const response = await fetch(
          `/api/esims/list?${params.toString()}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const ordersArray = data?.data?.orders || data?.orders || [];
        
        if (data.success && Array.isArray(ordersArray)) {
          // Filter out credit card applications - more aggressive filtering
          const filteredOrders = ordersArray.filter(order => {
            // Check for credit card application indicators in multiple locations
            const orderType = order.orderType || 
                             (order.orderResult && typeof order.orderResult === 'object' && order.orderResult.orderType) || 
                             (order.metadata && typeof order.metadata === 'object' && order.metadata.type) ||
                             (order.metadata && typeof order.metadata === 'object' && order.metadata.orderType) ||
                             null;
            
            // Also check if planName suggests it's a credit card application
            const planName = (order.planName || '').toLowerCase();
            const isCreditCardPlan = planName.includes('credit') || planName.includes('card');
            
            // Check if orderId suggests it's a credit card (some credit card orders might have specific patterns)
            const orderIdStr = (order.orderId || order.id || '').toString().toLowerCase();
            const isCreditCardOrderId = orderIdStr.includes('credit') || orderIdStr.includes('card');
            
            // Filter out if any indicator suggests it's a credit card application
            if (orderType === 'credit_card_application' || 
                orderType === 'credit_card' ||
                isCreditCardPlan ||
                isCreditCardOrderId) {
                return false;
            }
            return true;
          });
          
          
          const ordersData = filteredOrders.map(order => {
            // PRIORITY: Use stored countryCode/countryName from order if available
            let countryCode = order.countryCode || null;
            let countryName = order.countryName || null;
            
            // Only derive from plan ID if country is not stored
            if (!countryCode || !countryName) {
            const correctCountry = getCorrectCountryForOrder(order);
              countryCode = correctCountry.code;
              countryName = correctCountry.name;
            }
            
            // Get plan name first (prioritize actual planName over planId)
            const planId = order.planId || order.packageId || order.orderSlug || '';
            const planName = order.orderResult?.planName || order.planName || planId || t('dashboard.unknownPlan', 'Неизвестный план');
            
            // Prioritize paymentStatus when it's 'paid' - show 'paid' instead of 'processing'
            let displayStatus = order.status || 'unknown';
            if (order.paymentStatus === 'paid' && order.status === 'processing') {
              displayStatus = 'paid';
            }
            
            return {
              id: order.id,
              orderId: order.orderId || order.id,
              planName: planName,
              planId: planId,
              orderResult: order.orderResult, // Include orderResult for formatPlanDisplay function
              amount: order.amount || 0,
              status: displayStatus,
              paymentStatus: order.paymentStatus, // Keep paymentStatus for reference
              customerEmail: order.customerEmail || userEmail,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              // Map country information with translation and Airalo flag URL
              countryCode: countryCode,
              countryName: translateCountryName(countryCode, countryName, locale),
              flagUrl: order.flagUrl || null, // Use Airalo's flag URL from database
              // Map QR code data
              qrCode: {
                qrCode: order.qrCode,
                qrCodeUrl: order.qrCodeUrl,
                directAppleInstallationUrl: order.directAppleInstallationUrl,
                iccid: order.iccid,
                lpa: order.lpa,
                matchingId: order.matchingId
              },
              // Map usage data if available
              usage: order.dataUsage || order.usage || null,
              iccid: order.iccid
            };
          });
          
          // Sort orders by creation date (newest first)
          const allOrders = ordersData.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Newest first
          });
          
          
          setOrders(allOrders);
        } else {
          setOrders([]);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOrders([]);
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
  }, [currentUser, locale, t]);

  useEffect(() => {
    // Wait for auth to finish loading before fetching data
    if (authLoading) {
      setLoading(true);
      return;
    }
    
    // No user and auth is done, stop loading
    if (!currentUser) {
      setLoading(false);
      setOrders([]);
      return;
    }

    // User exists, fetch data
    fetchData();
  }, [currentUser, locale, authLoading, fetchData]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  // Show loading while checking auth (with max wait time feedback)
  // Only show loading if auth is actively loading AND we don't have a user yet
  // If we have a user but authLoading is still true (profile creation in progress), show dashboard anyway
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white">{t('dashboard.loadingDashboard', 'Loading dashboard...')}</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{t('dashboard.checkingAuth', 'Checking authentication...')}</p>
        </div>
      </div>
    );
  }

  // If no user after auth loading completes, redirect to login
  if (!authLoading && !currentUser) {
    // Redirect is handled by useEffect above, but show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white">{t('dashboard.redirectingToLogin', 'Redirecting to login...')}</p>
        </div>
      </div>
    );
  }

  // If we have a user but no email, something is wrong - log it but still show dashboard
  if (currentUser && !currentUser.email) {
    console.warn('⚠️ Current user exists but has no email:', currentUser);
  }

  // Orders are already filtered to active only during fetch
  // Just use the orders directly
  const displayedOrders = orders;


  const handleViewQRCode = async (order) => {
    const orderId = order.orderId || order.id;
    if (!orderId) {
      toast.error(t('dashboard.noOrderId', 'ID заказа не найден'));
      return;
    }

    console.log('🔍 Fetching QR code for order:', orderId);
    let appleUrl = order.qrCode?.directAppleInstallationUrl || order.directAppleInstallationUrl;

    if (!appleUrl) {
      try {
        console.log('📡 Fetching QR code from API...');
        const res = await fetch('/api/public/qr-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ QR code API error:', res.status, errorText);
          throw new Error(`API returned ${res.status}`);
        }

        const data = await res.json();
        console.log('📦 QR code API response:', data);

        if (data.success === false) {
          console.warn('⚠️ QR code not available:', data.error);
          toast.error(t('dashboard.qrCodeNotReady', 'QR код ещё не готов. Попробуйте позже.'));
          return;
        }

        appleUrl = data?.directAppleInstallationUrl || null;
      } catch (error) {
        console.error('❌ Error fetching QR code:', error);
        toast.error(t('dashboard.failedToLoadQR', 'Не удалось загрузить QR код'));
        return;
      }
    }

    if (appleUrl) {
      console.log('✅ Opening Apple installation URL:', appleUrl);
      // Open Apple URL directly instead of in iframe (Apple URLs can't be embedded)
      window.location.href = appleUrl;
    } else {
      console.warn('⚠️ No Apple installation URL available');
      toast.error(t('dashboard.appleUrlNotAvailable', 'Ссылка установки пока недоступна'));
    }
  };

  const generateQRCode = async (orderId, planName, retryCount = 0) => {
    try {
      // Try to get real QR code from RoamJet API
      console.log(`📱 Attempting to get real QR code for order: ${orderId} (attempt ${retryCount + 1})`);
      
      // Mock QR code result (Supabase-based)
      const qrCodeResult = {
        success: true,
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        message: 'QR code generated successfully'
      };
      
      if (qrCodeResult.success && qrCodeResult.qrCode) {
        console.log('✅ Real QR code received:', qrCodeResult);
        return {
          qrCode: qrCodeResult.qrCode,
          qrCodeUrl: qrCodeResult.qrCodeUrl,
          directAppleInstallationUrl: qrCodeResult.directAppleInstallationUrl,
          iccid: qrCodeResult.iccid,
          lpa: qrCodeResult.lpa,
          matchingId: qrCodeResult.matchingId,
          activationCode: qrCodeResult.activationCode,
          smdpAddress: qrCodeResult.smdpAddress,
          orderDetails: qrCodeResult.orderDetails,
          simDetails: qrCodeResult.simDetails,
          fromCache: qrCodeResult.fromCache || false,
          canRetrieveMultipleTimes: qrCodeResult.canRetrieveMultipleTimes || false,
          isReal: true
        };
      } else {
        throw new Error('No QR code data received');
      }
    } catch (error) {
      console.log(`⚠️ Real QR code failed (attempt ${retryCount + 1}):`, error.message);
      
      // If this is a "not ready yet" error and we haven't retried too many times, retry
      if (error.message.includes('not available yet') && retryCount < 3) {
        console.log('⏳ QR code not ready, retrying in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return generateQRCode(orderId, planName, retryCount + 1);
      }
      
      // Fallback to simple data string
      const qrData = `eSIM:${orderId || 'unknown'}|Plan:${planName || 'unknown'}|Status:Active`;
      return {
        qrCode: qrData,
        isReal: false,
        fallbackReason: error.message,
        canRetry: true
      };
    }
  };

  const handleCheckEsimDetails = async () => {
    if (!selectedOrder || loadingEsimDetails) return;
    
    try {
      setLoadingEsimDetails(true);
      console.log('📊 Checking eSIM details for order:', selectedOrder);
      
      // Get ICCID from the order
      const iccid = selectedOrder.qrCode?.iccid || selectedOrder.iccid;
      
      if (!iccid) {
        console.log('❌ No ICCID found in order');
        alert(t('dashboard.noIccidFound', 'ICCID не найден в этом заказе. Невозможно проверить детали eSIM.'));
        return;
      }
      
      console.log('📊 Checking eSIM details for ICCID:', iccid);
      // Mock eSIM details (Supabase-based)
      const result = {
        success: true,
        data: {
          iccid: iccid,
          status: 'Active',
          dataUsed: '0.5 ГБ',
          dataRemaining: '2.5 ГБ',
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      
      if (result.success) {
        setEsimDetails(result.data);
        console.log('✅ eSIM details retrieved:', result.data);
        
        // Update country info if needed
        await updateOrderCountryInfo(selectedOrder, result.data);
      } else {
        console.log('❌ Failed to get eSIM details:', result.error);
        alert(t('dashboard.failedToGetEsimDetails', 'Failed to get eSIM details: {{error}}', { error: result.error }));
      }
    } catch (error) {
      console.error('❌ Error checking eSIM details:', error);
      alert(t('dashboard.errorCheckingEsimDetails', 'Error checking eSIM details: {{error}}', { error: error.message }));
    } finally {
      setLoadingEsimDetails(false);
    }
  };

  const handleCheckEsimUsage = async () => {
    if (!selectedOrder || loadingEsimUsage) return;
    
    try {
      setLoadingEsimUsage(true);
      console.log('📊 Checking eSIM usage for order:', selectedOrder);
      
      // Get ICCID from the order
      const iccid = selectedOrder.qrCode?.iccid || selectedOrder.iccid;
      
      if (!iccid) {
        console.log('❌ No ICCID found in order');
        alert(t('dashboard.noIccidFoundUsage', 'ICCID не найден в этом заказе. Невозможно проверить использование eSIM.'));
        return;
      }
      
      console.log('📊 Checking eSIM usage for ICCID:', iccid);
      // Mock eSIM usage (Supabase-based)
      const result = {
        success: true,
        data: {
          iccid: iccid,
          totalData: '3 ГБ',
          usedData: '0.8 ГБ',
          remainingData: '2.2 ГБ',
          usagePercentage: 27,
          dailyUsage: [
            { date: '2024-01-01', usage: '0.1 ГБ' },
            { date: '2024-01-02', usage: '0.3 ГБ' },
            { date: '2024-01-03', usage: '0.4 ГБ' }
          ]
        }
      };
      
      if (result.success) {
        setEsimUsage(result.data);
        console.log('✅ eSIM usage retrieved:', result.data);
      } else {
        console.log('❌ Failed to get eSIM usage:', result.error);
        alert(t('dashboard.failedToGetEsimUsage', 'Failed to get eSIM usage: {{error}}', { error: result.error }));
      }
    } catch (error) {
      console.error('❌ Error checking eSIM usage:', error);
      alert(t('dashboard.errorCheckingEsimUsage', 'Error checking eSIM usage: {{error}}', { error: error.message }));
    } finally {
      setLoadingEsimUsage(false);
    }
  };

  const handleDeleteOrder = async (deletedOrder) => {
    // Remove from local state and refresh
    setOrders(prev => prev.filter(order => 
      (order.orderId || order.id) !== (deletedOrder.orderId || deletedOrder.id)
    ));
    
    // Also delete the associated pending eSIM if it exists
    try {
      const orderId = deletedOrder.orderId || deletedOrder.id;
      // Try to delete the pending eSIM record
      const esimResponse = await fetch(`/api/esims?orderId=${orderId}`, {
        method: 'GET',
      });
      
      if (esimResponse.ok) {
        const esimData = await esimResponse.json();
        if (esimData.success && esimData.esims && esimData.esims.length > 0) {
          const esim = esimData.esims[0];
          if (esim._id) {
            await fetch(`/api/esims/delete?esimId=${encodeURIComponent(esim._id)}`, {
              method: 'DELETE',
            });
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Error deleting associated eSIM:', error);
      // Don't fail if eSIM deletion fails
    }
    
    // Refresh the orders list
    fetchData();
  };


  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader />

        {/* Stats Cards */}
        <StatsCards
          orders={orders}
        />

        {/* Recent Orders */}
        <RecentOrders
          orders={displayedOrders}
          loading={loading}
          onViewQRCode={handleViewQRCode}
          onDeleteOrder={handleDeleteOrder}
        />

        {/* Account Settings */}
        <AccountSettings
          currentUser={currentUser}
        />

        <div className="h-12" />
      </div>


      {/* eSIM Details Modal */}
      <EsimDetailsModal 
        esimDetails={esimDetails}
        onClose={() => setEsimDetails(null)}
      />

      {/* eSIM Usage Modal */}
      <EsimUsageModal 
        esimUsage={esimUsage}
        onClose={() => setEsimUsage(null)}
      />

      {/* Apple installation bottom sheet (webview-like, same as Robokassa flow) */}
      <BottomSheet
        isOpen={!!appleInstallUrl}
        onClose={() => setAppleInstallUrl(null)}
        title={t('dashboard.installEsim', 'Установка eSIM')}
        maxHeight="85vh"
      >
        <div className="w-full h-[70vh] min-h-[400px] bg-white dark:bg-gray-900 rounded-b-2xl">
          <iframe
            src={appleInstallUrl || ''}
            title={t('dashboard.installEsim', 'Установка eSIM')}
            className="w-full h-full border-0 rounded-b-2xl"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </BottomSheet>
    </div>
  );
};

export default Dashboard;

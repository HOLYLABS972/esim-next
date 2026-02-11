'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Globe,
  Wifi,
  Clock,
  Shield,
  Zap,
  CreditCard,
  Loader2,
  Battery
} from 'lucide-react';
import { getDisplayAmountFromItem, formatPriceFromItem } from '../services/currencyService';
import toast from 'react-hot-toast';

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

const TopupPage = ({ iccid, countryCode: urlCountryCode }) => {
  const searchParams = useSearchParams();
  
  // Get country code from multiple sources (safe for SSR)
  const countryFromSearchParams = searchParams?.get('country') || searchParams?.get('countryCode');
  const effectiveCountryCode = urlCountryCode || countryFromSearchParams;
  
  const router = useRouter();
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedRefund, setAcceptedRefund] = useState(false);

  useEffect(() => {
    if (iccid) {
      fetchOrderInfo();
    }
  }, [iccid]);

  // Fetch packages after order info is loaded
  useEffect(() => {
    // Get country code from URL or order info
    let countryFromUrl = null;
    if (typeof window !== 'undefined') {
      const currentSearchParams = new URLSearchParams(window.location.search);
      countryFromUrl = currentSearchParams.get('country') || currentSearchParams.get('countryCode');
    }

    // Use country from URL or from order info (fetched from database)
    const effectiveCountry = countryFromUrl || orderInfo?.countryCode;

    // Require: ICCID and country code (from URL or order lookup)
    if (iccid && effectiveCountry) {
      fetchTopupPackages(effectiveCountry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderInfo, iccid, countryFromSearchParams]);

  const fetchOrderInfo = async () => {
    try {
      setLoading(true);

      // Detect if parameter is ICCID or orderId
      // ICCIDs are typically 19-20 digits and start with 8985 (eSIM prefix)
      // Order IDs are typically 13-15 digits
      const isIccid = iccid && /^8985\d{15,16}$/.test(iccid);
      const actualIccid = isIccid ? iccid : null;
      const actualOrderId = isIccid ? null : iccid;
      
      // Try to fetch order/esim info to get original plan slug and ICCID
      let originalPlanSlug = null;
      let foundIccid = actualIccid;
      
      // Get country code from URL only
      let countryFromUrl = null;
      if (typeof window !== 'undefined') {
        try {
          const currentSearchParams = new URLSearchParams(window.location.search);
          countryFromUrl = currentSearchParams.get('country') || currentSearchParams.get('countryCode');
        } catch (e) {
          console.warn('⚠️ Error reading URL params:', e);
        }
      }
      let orderCountryCode = countryFromUrl || null;
      
      try {
        // If we have an orderId, look up the order in Supabase
        if (actualOrderId) {
          console.log('🔍 Looking up order by orderId:', actualOrderId);
          const orderResponse = await fetch(`/api/orders/get?orderId=${actualOrderId}`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            if (orderData.success && orderData.order) {
              const order = orderData.order;
              foundIccid = order.iccid || foundIccid;
              // Try to get plan slug from metadata or package_id
              if (order.metadata?.airalo_package_slug) {
                originalPlanSlug = order.metadata.airalo_package_slug;
              }
              // Get country code from order, or from package relation
              if (!orderCountryCode) {
                orderCountryCode = order.countryCode || order.country_code || order.package?.country?.code || order.package?.countryId;
              }
              // Also get ICCID if available
              if (!foundIccid && order.iccid) {
                foundIccid = order.iccid;
              }
            }
          }
        } else if (actualIccid) {
          // Try to find order by ICCID
          const orderResponse = await fetch(`/api/orders/get?iccid=${actualIccid}`);
          if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            if (orderData.success && orderData.order) {
              const order = orderData.order;
              if (order.metadata?.airalo_package_slug) {
                originalPlanSlug = order.metadata.airalo_package_slug;
              }
              // Get country code from order, or from package relation
              if (!orderCountryCode) {
                orderCountryCode = order.countryCode || order.country_code || order.package?.country?.code || order.package?.countryId;
              }
            }
          }
        }
      } catch (orderError) {
        console.log('⚠️ Could not fetch order info, will use URL params only:', orderError);
      }
      
      // Use found ICCID or the original parameter
      const finalIccid = foundIccid || (isOrderId ? null : iccid);
      
      console.log('📦 Creating order info - ICCID:', finalIccid, 'OrderId:', actualOrderId);
      console.log('🌍 Country code:', orderCountryCode);
      console.log('📦 Original plan slug:', originalPlanSlug);
      
      setOrderInfo({
        iccid: finalIccid,
        orderId: actualOrderId,
        customerEmail: 'customer@example.com',
        countryCode: orderCountryCode,
        originalPlanSlug: originalPlanSlug // Store original plan slug for matching
      });
      
      console.log('✅ Order info created');
      
    } catch (error) {
      console.error('❌ Error creating order info:', error);
      // Create basic order info even if there's an error
      let countryFromUrl = null;
      if (typeof window !== 'undefined') {
        try {
          const currentSearchParams = new URLSearchParams(window.location.search);
          countryFromUrl = currentSearchParams.get('country') || currentSearchParams.get('countryCode');
        } catch (e) {
          console.warn('⚠️ Error reading URL params:', e);
        }
      }
      // Detect if parameter is ICCID or orderId
      const isIccid = iccid && /^8985\d{15,16}$/.test(iccid);
      const actualIccid = isIccid ? iccid : null;
      const actualOrderId = isIccid ? null : iccid;
      
      setOrderInfo({
        iccid: actualIccid,
        orderId: actualOrderId,
        customerEmail: 'customer@example.com',
        countryCode: countryFromUrl || null
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopupPackages = async (countryCode) => {
    try {
      setLoadingPackages(true);

      // Require country code
      if (!countryCode) {
        console.error('❌ No country code - cannot fetch topup packages');
        setAvailablePackages([]);
        return;
      }

      // Build API URL with country filter
      const apiUrl = `/api/public/topups?limit=1000&country=${encodeURIComponent(countryCode)}`;
      
      console.log('📡 API URL:', apiUrl);
      
      // Fetch from Supabase API
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('📦 Supabase API response:', result);
      
      if (!result.success || !result.data?.plans || result.data.plans.length === 0) {
        console.log('❌ No topup packages found matching country and slug prefix');
        setAvailablePackages([]);
        return;
      }
      
      // Transform Supabase response to match our format
      const packages = result.data.plans.map((pkg) => ({
        id: pkg._id || pkg.id,
        slug: pkg.slug || pkg.id,
        airaloSlug: pkg.slug || pkg.id,
        name: pkg.name || pkg.title,
        data: pkg.dataAmount || pkg.data || 'N/A',
        price: parseFloat(pkg.price) || 0,
        validity: pkg.validity || pkg.period || pkg.duration || 'N/A',
        period: pkg.validity || pkg.period || pkg.duration || 'N/A',
        country_codes: pkg.country_codes || [],
        country_code: pkg.country || (pkg.country_codes && pkg.country_codes[0]) || null,
        country_name: orderInfo?.countryName || null
      }));
      
      // Sort by price
      packages.sort((a, b) => a.price - b.price);
      
      console.log('✅ Found', packages.length, 'topup packages from Supabase');
      console.log('📦 All package slugs:', packages.map(p => p.airaloSlug || p.id));
      
      setAvailablePackages(packages);
      
    } catch (error) {
      console.error('❌ Error fetching topup packages from Supabase:', error);
      toast.error('Failed to load topup packages');
      setAvailablePackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePurchase = async () => {
    if (!acceptedRefund) {
      toast.error('Please accept the refund policy to continue');
      return;
    }

    if (!selectedPackage) {
      toast.error('Please select a topup package');
      return;
    }

    if (!iccid) {
      toast.error('No ICCID found. Cannot create topup.');
      return;
    }

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      // Generate unique topup order ID (numeric for Robokassa)
      const topupOrderId = Date.now(); // Numeric timestamp
      
      // Create order data for payment - use the real package slug
      const packageId = selectedPackage.airaloSlug || selectedPackage.id;
      
      // Use server-provided RUB only – no conversion on frontend
      const { amount: amountRUB, currency } = getDisplayAmountFromItem(selectedPackage, 'RUB');
      if (currency !== 'RUB' || !amountRUB || amountRUB <= 0) {
        toast.error('RUB price not available for this package');
        return;
      }
      
      // Get country code and flag
      const countryCode = orderInfo?.countryCode || effectiveCountryCode;
      const countryName = orderInfo?.countryName;
      const countryFlag = countryCode ? getFlagEmoji(countryCode) : '🌍';
      
      const orderData = {
        orderId: topupOrderId,
        planId: packageId,
        planName: selectedPackage.name,
        customerEmail: orderInfo?.customerEmail || 'customer@example.com',
        amount: amountRUB,
        currency: 'RUB',
        type: 'topup', // Mark as topup
        iccid: iccid,
        packageId: packageId
      };

      console.log('💳 [SERVER] Topup order data for payment:', orderData);

      // Store topup info in localStorage for after payment
      const topupStorageData = {
        orderId: topupOrderId,
        iccid: iccid,
        packageId: packageId,
        packageName: selectedPackage.name,
        amount: amountRUB,
        customerEmail: orderData.customerEmail,
        type: 'topup',
        paymentMethod: 'robokassa'
      };
      
      console.log('💾 Storing topup order in localStorage:', topupStorageData);
      localStorage.setItem('pendingTopupOrder', JSON.stringify(topupStorageData));

      // Create pending order in Supabase
      try {
        const createOrderResponse = await fetch('/api/orders/create-pending', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: topupOrderId,
            packageId: packageId,
            customerEmail: orderData.customerEmail,
            amount: amountRUB,
            currency: 'RUB',
            description: `Topup: ${selectedPackage.name}`,
            userId: null,
            quantity: 1,
            orderType: 'esim_topup', // Important: mark as topup
            metadata: {
              type: 'esim_topup',
              existingEsimIccid: iccid,
              packageId: packageId,
              planSlug: packageId, // Store slug in metadata for reference
              countryCode: countryCode || orderInfo?.countryCode,
              countryName: countryName || orderInfo?.countryName,
              countryFlag: countryFlag || '🌍' // Store flag emoji
            }
          })
        });

        if (createOrderResponse.ok) {
          console.log('✅ Pending topup order created in Supabase');
        } else {
          console.error('⚠️ Failed to create pending topup order in Supabase');
        }
      } catch (err) {
        console.error('⚠️ Error creating pending topup order:', err);
        // Don't block payment flow
      }

      // Create payment link with Robokassa
      const response = await fetch('/api/robokassa/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: topupOrderId,
          email: orderData.customerEmail,
          name: `Topup: ${selectedPackage.name}`,
          total: amountRUB,
          currency: 'RUB',
          domain: typeof window !== 'undefined' ? window.location.origin : '',
          description: `eSIM Topup for ICCID ${iccid.substring(0, 10)}...`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const result = await response.json();
      
      if (result.paymentUrl) {
        console.log('✅ Payment URL created, redirecting to Robokassa...');
        if (typeof window !== 'undefined') {
        window.location.href = result.paymentUrl;
        }
      } else {
        throw new Error('No payment URL received');
      }
      
    } catch (error) {
      console.error('❌ Payment redirect failed:', error);
      toast.error(error.message || 'Failed to start payment process');
      setIsProcessing(false);
    }
  };

  const formatData = (data, unit = 'GB') => {
    if (data === 'Unlimited' || data === -1) {
      return 'Unlimited';
    }
    
    // Handle cases where data might already contain the unit
    if (typeof data === 'string' && data.includes(unit)) {
      return data; // Return as-is if unit is already included
    }
    
    return `${data} ${unit}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading topup information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <Battery className="w-6 h-6 text-green-500" />
                <h1 className="text-xl font-bold text-gray-900">Add Data (Topup)</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow-lg overflow-hidden"
        >
          {/* Package Selection */}
          <div className="bg-white px-4 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Select Topup Package</h2>
              {selectedPackage && (
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Change Package
                </button>
              )}
            </div>
              
            {loadingPackages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading packages...</span>
              </div>
            ) : availablePackages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-semibold mb-2">No topup packages found</p>
                <p className="text-sm mt-2 text-gray-400">
                  {orderInfo?.countryCode && `Country: ${orderInfo.countryCode} • `}
                  ICCID: {iccid}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePackages
                  .filter(pkg => !selectedPackage || pkg.id === selectedPackage.id)
                  .map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPackage?.id === pkg.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                      
                      {/* Package Slug - Display for debugging */}
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                          Slug: {pkg.airaloSlug || pkg.id}
                        </div>
                      </div>
                      
                      {/* Country Info */}
                      {pkg.country_codes && pkg.country_codes.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">Countries</div>
                          <div className="flex flex-wrap gap-1">
                            {pkg.country_codes.slice(0, 3).map((code, index) => (
                              <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {code}
                              </span>
                            ))}
                            {pkg.country_codes.length > 3 && (
                              <span className="text-xs text-gray-500">+{pkg.country_codes.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Wifi className="w-4 h-4 text-gray-600" />
                            <div>
                              <div className="text-xs text-gray-600">Data</div>
                              <div className="font-semibold text-black text-sm">{formatData(pkg.data)}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <div>
                              <div className="text-xs text-gray-600">Validity</div>
                              <div className="font-semibold text-black text-sm">{pkg.validity}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          ${pkg.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Package Actions */}
          {selectedPackage && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                {/* Get Package Section */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Get This Package</h3>
                  <div className="max-w-md mx-auto mb-4 text-left">
                    <label htmlFor="acceptRefund" className="flex items-start gap-3 text-sm text-gray-700">
                      <input
                        id="acceptRefund"
                        type="checkbox"
                        checked={acceptedRefund}
                        onChange={(e) => setAcceptedRefund(e.target.checked)}
                        className={"mt-1 h-4 w-4 rounded border-gray-300 focus:ring-blue-500 " + (acceptedRefund ? 'text-blue-600' : 'checkbox-red')}
                      />
                      <span>
                        I accept the <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Refund Policy</a>
                      </span>
                    </label>
                  </div>

                  {/* Payment Method Button */}
                  <div className="space-y-3 max-w-md mx-auto">
                    <button
                      onClick={handlePurchase}
                      disabled={!acceptedRefund || isProcessing}
                      className={`w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-xl transition-all duration-200 font-medium text-lg shadow-lg text-white ${
                        isProcessing 
                          ? 'bg-blue-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } ${!acceptedRefund || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <CreditCard className="w-6 h-6" />
                      )}
                      <span>
                        Purchase Now - {formatPriceFromItem(selectedPackage, 'RUB').formatted}
                      </span>
                    </button>
                  </div>
                </div>

                {/* How to Use Section */}
                <div className="text-center">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">How to Use</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center text-center p-4">
                      <div className="bg-yellow-100 p-3 rounded-full mb-3">
                        <Zap className="w-8 h-8 text-yellow-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Instant Activation</h4>
                      <p className="text-sm text-gray-600">Get connected immediately after purchase</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4">
                      <div className="bg-green-100 p-3 rounded-full mb-3">
                        <Shield className="w-8 h-8 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Secure & Reliable</h4>
                      <p className="text-sm text-gray-600">Trusted by millions of travelers worldwide</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-4">
                      <div className="bg-blue-100 p-3 rounded-full mb-3">
                        <Globe className="w-8 h-8 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Global Coverage</h4>
                      <p className="text-sm text-gray-600">Stay connected wherever you go</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TopupPage;


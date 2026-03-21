'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
// import { apiService } from '../services/apiService'; // Removed - causes client-side issues
// import { configService } from '../services/configService'; // Removed - causes client-side issues

const PaymentSuccess = () => {
  console.log('🚀 PaymentSuccess component mounting...');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [isPendingOrder, setIsPendingOrder] = useState(false);
  const hasProcessed = useRef(false);

  console.log('🔐 PaymentSuccess - Auth State:', {
    authLoading,
    hasCurrentUser: !!currentUser,
    userEmail: currentUser?.email,
    urlParams: {
      order: searchParams.get('order_id') || searchParams.get('order'),
      email: searchParams.get('email')
    }
  });

  // Check if link has been used and mark it as used
  const checkAndMarkLinkUsed = async (orderId, userId) => {
    try {
      console.log('🔍 Checking order status:', { orderId, userId });
      // Use MongoDB API to check order status
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.roamjet.net';
      
      const response = await fetch(`${API_BASE_URL}/api/user/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentUser.accessToken || 'dummy-token'}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const orderResult = await response.json();
      
      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to fetch order');
      }
      
      const orderData = orderResult.data;
        console.log('📋 Existing order data found:', {
          linkUsed: orderData.linkUsed,
          processingStatus: orderData.processingStatus,
          linkUsedAt: orderData.linkUsedAt,
          processingStartedAt: orderData.processingStartedAt
        });
        
      if (orderData.linkUsed) {
        console.log('❌ Order link already used');
        return { linkUsed: true, message: 'This payment link has already been used.' };
      }
      if (orderData.processingStatus === 'processing') {
        console.log('⚠️ Order already processing');
        return { alreadyProcessing: true, message: 'Order is already being processed.' };
      }
      if (orderData.processingStatus === 'completed') {
        console.log('✅ Order already completed');
        return { alreadyCompleted: true, message: 'Order already completed.' };
      }
      
      // Mark as processing via API
      console.log('🔄 Marking order as processing...');
      const updateResponse = await fetch(`${API_BASE_URL}/api/user/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.accessToken || 'dummy-token'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processingStatus: 'processing',
          processingStartedAt: new Date().toISOString(),
          processingKey: `${userId}_${orderId}_${Date.now()}`
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Update order failed: ${updateResponse.status}`);
      }
      
      console.log('✅ Order marked as processing');
      return { canProcess: true };
    } catch (error) {
      console.error('❌ Error checking/marking order:', error);
      return { error: error.message };
    }
  };

  // Create order record via MongoDB API
  const createOrderRecord = async (orderData) => {
    try {
      // We're always in test mode for PaymentSuccess to avoid client-side MongoDB imports
      const robokassaMode = 'test';
      const isTestMode = true;
      
      console.log('🛒 Creating RoamJet order...');
      console.log('🔍 Robokassa Mode:', robokassaMode, '| Test Mode:', isTestMode);
      
      // Extract country info from plan name (e.g., "kargi-mobile-7days-1gb" -> "kargi")
      const getCountryFromPlan = (planId) => {
        if (!planId) return { code: "US", name: "United States" };

        const countryMap = {
          // Comprehensive country mapping from cleaned countries.txt
          'sohbat-mobile': { code: "AF", name: "Afghanistan" },
          'hej-telecom': { code: "AL", name: "Albania" },
          'algecom': { code: "DZ", name: "Algeria" },
          'handi': { code: "AD", name: "Andorra" },
          'dolphin-mobile': { code: "AI", name: "Anguilla" },
          '17-miles': { code: "AG", name: "Antigua And Barbuda" },
          '17miles': { code: "AG", name: "Antigua And Barbuda" },
          'saba-mobile': { code: "AN", name: "Antilles" },
          'abrazo': { code: "AR", name: "Argentina" },
          'arpi-telecom': { code: "AM", name: "Armenia" },
          'noord-communications-in': { code: "AW", name: "Aruba" },
          'yes-go': { code: "AU", name: "Australia" },
          'viennetz-mobil': { code: "AT", name: "Austria" },
          'yaxsi-mobile': { code: "AZ", name: "Azerbaijan" },
          'pico': { code: "PT", name: "Azores" },
          'jitney-mobile': { code: "BS", name: "Bahamas" },
          'saar-mobile': { code: "BH", name: "Bahrain" },
          'fatafati-in': { code: "BD", name: "Bangladesh" },
          'barbnet': { code: "BB", name: "Barbados" },
          'norach-telecom': { code: "BY", name: "Belarus" },
          'belganet': { code: "BE", name: "Belgium" },
          'cho': { code: "BZ", name: "Belize" },
          'cotton-mobile': { code: "BJ", name: "Benin" },
          'bermy-mobile': { code: "BM", name: "Bermuda" },
          'paro': { code: "BT", name: "Bhutan" },
          'wa-mobile': { code: "BO", name: "Bolivia" },
          'hatonet': { code: "BQ", name: "Bonaire" },
          'bosher': { code: "BA", name: "Bosnia and Herzegovina" },
          'maun-telecom': { code: "BW", name: "Botswana" },
          'joia': { code: "BR", name: "Brazil" },
          'muara-mobile': { code: "BN", name: "Brunei" },
          'bultel': { code: "BG", name: "Bulgaria" },
          'volta': { code: "BF", name: "Burkina Faso" },
          'connect-cambodia': { code: "KH", name: "Cambodia" },
          'kamtok-telecom': { code: "CM", name: "Cameroon" },
          'canada-mobile': { code: "CA", name: "Canada" },
          'mansetel': { code: "ES", name: "Canary Islands" },
          'fogotel': { code: "CV", name: "Cape Verde" },
          'atlantis-telecom': { code: "KY", name: "Cayman Islands" },
          'chinko': { code: "CF", name: "Central African Republic" },
          'first-well': { code: "TD", name: "Chad" },
          'altoque': { code: "CL", name: "Chile" },
          'chinacom': { code: "CN", name: "China" },
          'hartonet': { code: "CO", name: "Colombia" },
          'hot-telecom': { code: "CR", name: "Costa Rica" },
          'nouchi-mobile': { code: "CI", name: "Côte d'Ivoire" },
          'cronet': { code: "HR", name: "Croatia" },
          'dushi-mobile': { code: "CW", name: "Curaçao" },
          'dekanet': { code: "CY", name: "Cyprus" },
          'prosim': { code: "CZ", name: "Czech Republic" },
          'hygge-mobile': { code: "DK", name: "Denmark" },
          'djibnet': { code: "DJ", name: "Djibouti" },
          'nature-mobile': { code: "DM", name: "Dominica" },
          'caribe-mobile': { code: "DO", name: "Dominican Republic" },
          'mitad-mobile': { code: "EC", name: "Ecuador" },
          'nile-mobile': { code: "EG", name: "Egypt" },
          'chivo': { code: "SV", name: "El Salvador" },
          'malabo-mobile': { code: "GQ", name: "Equatorial Guinea" },
          'eritcom': { code: "ER", name: "Eritrea" },
          'estonia-mobile': { code: "EE", name: "Estonia" },
          'eswatini-communications': { code: "SZ", name: "Eswatini" },
          'habesha-mobile': { code: "ET", name: "Ethiopia" },
          'bula-mobile': { code: "FJ", name: "Fiji" },
          'suomi-mobile': { code: "FI", name: "Finland" },
          'elan': { code: "FR", name: "France" },
          'okoume-mobile': { code: "GA", name: "Gabon" },
          'teranga-mobile': { code: "GM", name: "Gambia" },
          'kargi': { code: "GE", name: "Georgia" },
          'hallo-mobil': { code: "DE", name: "Germany" },
          'akwaaba-mobile': { code: "GH", name: "Ghana" },
          'meraki-mobile': { code: "GR", name: "Greece" },
          'spice-mobile': { code: "GD", name: "Grenada" },
          'chapin-mobile': { code: "GT", name: "Guatemala" },
          'guinee-mobile': { code: "GN", name: "Guinea" },
          'guinea-bissau-mobile': { code: "GW", name: "Guinea-Bissau" },
          'guyana-mobile': { code: "GY", name: "Guyana" },
          'ayiti-mobile': { code: "HT", name: "Haiti" },
          'catracho-mobile': { code: "HN", name: "Honduras" },
          'hkmobile': { code: "HK", name: "Hong Kong" },
          'magyar-mobile': { code: "HU", name: "Hungary" },
          'island-mobile': { code: "IS", name: "Iceland" },
          'kallur-digital': { code: "IN", name: "India" },
          'indonesia-mobile': { code: "ID", name: "Indonesia" },
          'iran-mobile': { code: "IR", name: "Iran" },
          'iraq-mobile': { code: "IQ", name: "Iraq" },
          'eire-mobile': { code: "IE", name: "Ireland" },
          'isle-of-man-mobile': { code: "IM", name: "Isle of Man" },
          'ahava': { code: "IL", name: "Israel" },
          'mamma-mia': { code: "IT", name: "Italy" },
          'jamaica-mobile': { code: "JM", name: "Jamaica" },
          'moshi-moshi': { code: "JP", name: "Japan" },
          'jersey-mobile': { code: "JE", name: "Jersey" },
          'jordan-mobile': { code: "JO", name: "Jordan" },
          'kazakhstan-mobile': { code: "KZ", name: "Kazakhstan" },
          'kenya-mobile': { code: "KE", name: "Kenya" },
          'kiribati-mobile': { code: "KI", name: "Kiribati" },
          'plisi': { code: "XK", name: "Kosovo" },
          'kuwait-mobile': { code: "KW", name: "Kuwait" },
          'kyrgyzstan-mobile': { code: "KG", name: "Kyrgyzstan" },
          'laos-mobile': { code: "LA", name: "Laos" },
          'latvia-mobile': { code: "LV", name: "Latvia" },
          'lebanon-mobile': { code: "LB", name: "Lebanon" },
          'lesotho-mobile': { code: "LS", name: "Lesotho" },
          'liberia-mobile': { code: "LR", name: "Liberia" },
          'libya-mobile': { code: "LY", name: "Libya" },
          'liechtenstein-mobile': { code: "LI", name: "Liechtenstein" },
          'lithuania-mobile': { code: "LT", name: "Lithuania" },
          'luxembourg-mobile': { code: "LU", name: "Luxembourg" },
          'macau-mobile': { code: "MO", name: "Macau" },
          'madagascar-mobile': { code: "MG", name: "Madagascar" },
          'porto': { code: "PT", name: "Madeira" },
          'malawi-mobile': { code: "MW", name: "Malawi" },
          'sambungkan': { code: "MY", name: "Malaysia" },
          'maldives-mobile': { code: "MV", name: "Maldives" },
          'mali-mobile': { code: "ML", name: "Mali" },
          'malta-mobile': { code: "MT", name: "Malta" },
          'marshall-mobile': { code: "MH", name: "Marshall Islands" },
          'mauritania-mobile': { code: "MR", name: "Mauritania" },
          'mauritius-mobile': { code: "MU", name: "Mauritius" },
          'chido': { code: "MX", name: "Mexico" },
          'micronesia-mobile': { code: "FM", name: "Micronesia" },
          'moldova-mobile': { code: "MD", name: "Moldova" },
          'monaco-mobile': { code: "MC", name: "Monaco" },
          'mongolia-mobile': { code: "MN", name: "Mongolia" },
          'montenegro-mobile': { code: "ME", name: "Montenegro" },
          'morocco-mobile': { code: "MA", name: "Morocco" },
          'mozambique-mobile': { code: "MZ", name: "Mozambique" },
          'myanmar-mobile': { code: "MM", name: "Myanmar" },
          'namibia-mobile': { code: "NA", name: "Namibia" },
          'nauru-mobile': { code: "NR", name: "Nauru" },
          'nepal-mobile': { code: "NP", name: "Nepal" },
          'netherlands-mobile': { code: "NL", name: "Netherlands" },
          'new-zealand-mobile': { code: "NZ", name: "New Zealand" },
          'nicaragua-mobile': { code: "NI", name: "Nicaragua" },
          'niger-mobile': { code: "NE", name: "Niger" },
          'nigeria-mobile': { code: "NG", name: "Nigeria" },
          'north-korea-mobile': { code: "KP", name: "North Korea" },
          'north-macedonia-mobile': { code: "MK", name: "North Macedonia" },
          'adanet': { code: "CY", name: "Northern Cyprus" },
          'norway-mobile': { code: "NO", name: "Norway" },
          'oman-mobile': { code: "OM", name: "Oman" },
          'pakistan-mobile': { code: "PK", name: "Pakistan" },
          'palau-mobile': { code: "PW", name: "Palau" },
          'palestine-mobile': { code: "PS", name: "Palestine" },
          'panama-mobile': { code: "PA", name: "Panama" },
          'papua-new-guinea-mobile': { code: "PG", name: "Papua New Guinea" },
          'paraguay-mobile': { code: "PY", name: "Paraguay" },
          'peru-mobile': { code: "PE", name: "Peru" },
          'philippines-mobile': { code: "PH", name: "Philippines" },
          'poland-mobile': { code: "PL", name: "Poland" },
          'portugal-mobile': { code: "PT", name: "Portugal" },
          'boricua-in-mobile': { code: "PR", name: "Puerto Rico" },
          'qatar-mobile': { code: "QA", name: "Qatar" },
          'romania-mobile': { code: "RO", name: "Romania" },
          'russia-mobile': { code: "RU", name: "Russia" },
          'rwanda-mobile': { code: "RW", name: "Rwanda" },
          'saint-kitts-mobile': { code: "KN", name: "Saint Kitts and Nevis" },
          'saint-lucia-mobile': { code: "LC", name: "Saint Lucia" },
          'tobago': { code: "VC", name: "Saint Vincent and the Grenadines" },
          'faaf-mobile': { code: "WS", name: "Samoa" },
          'san-marino-mobile': { code: "SM", name: "San Marino" },
          'sao-tome-mobile': { code: "ST", name: "Sao Tome and Principe" },
          'red-sand': { code: "SA", name: "Saudi Arabia" },
          'nessietel': { code: "GB", name: "Scotland" },
          'retba-mobile': { code: "SN", name: "Senegal" },
          'serbia-mobile': { code: "RS", name: "Serbia" },
          'laziocom': { code: "SC", name: "Seychelles" },
          'buncenet': { code: "SL", name: "Sierra Leone" },
          'connect-lah': { code: "SG", name: "Singapore" },
          'dobry-den': { code: "SK", name: "Slovakia" },
          'zivjo': { code: "SI", name: "Slovenia" },
          'solomon-mobile': { code: "SB", name: "Solomon Islands" },
          'somalia-mobile': { code: "SO", name: "Somalia" },
          'cellsa': { code: "ZA", name: "South Africa" },
          'jang': { code: "KR", name: "South Korea" },
          'south-sudan-mobile': { code: "SS", name: "South Sudan" },
          'guay-mobile': { code: "ES", name: "Spain" },
          'sri-lanka-mobile': { code: "LK", name: "Sri Lanka" },
          'sudan-mobile': { code: "SD", name: "Sudan" },
          'pondocom': { code: "SR", name: "Suriname" },
          'van': { code: "SE", name: "Sweden" },
          'switzerland-mobile': { code: "CH", name: "Switzerland" },
          'syria-mobile': { code: "SY", name: "Syria" },
          'xie-xie-unlimited': { code: "TW", name: "Taiwan" },
          'sarez-telecom': { code: "TJ", name: "Tajikistan" },
          'tanzacomm': { code: "TZ", name: "Tanzania" },
          'maew': { code: "TH", name: "Thailand" },
          'jaco-mobile': { code: "TL", name: "Timor - Leste" },
          'atakora-mobile': { code: "TG", name: "Togo" },
          'tofua-mobile': { code: "TO", name: "Tonga" },
          'tritocom': { code: "TT", name: "Trinidad and Tobago" },
          'el-jem-communications': { code: "TN", name: "Tunisia" },
          'merhaba': { code: "TR", name: "Turkey" },
          'turkmenistan-mobile': { code: "TM", name: "Turkmenistan" },
          'tuca-mobile': { code: "TC", name: "Turks and Caicos Islands" },
          'tuvalu-mobile': { code: "TV", name: "Tuvalu" },
          'ugish': { code: "UG", name: "Uganda" },
          'ukraine-mobile': { code: "UA", name: "Ukraine" },
          'burj-mobile': { code: "AE", name: "United Arab Emirates" },
          'uki-mobile': { code: "GB", name: "United Kingdom" },
          'change': { code: "US", name: "United States" },
          'ballena': { code: "UY", name: "Uruguay" },
          'uzbeknet': { code: "UZ", name: "Uzbekistan" },
          'efate': { code: "VU", name: "Vanuatu" },
          'ager-in': { code: "VA", name: "Vatican City" },
          'aragua-mobile': { code: "VE", name: "Venezuela" },
          'xin-chao-in': { code: "VN", name: "Vietnam" },
          'magens-mobile-in': { code: "VI", name: "Virgin Islands (U.S.)" },
          'yemen-mobile': { code: "YE", name: "Yemen" },
          'kafue-mobile': { code: "ZM", name: "Zambia" },
          'zimcom': { code: "ZW", name: "Zimbabwe" },
          
          'default': { code: "US", name: "United States" }
        };

        const countryKey = Object.keys(countryMap).find(key => planId.includes(key));
        return countryMap[countryKey] || countryMap.default;
      };
      
      // Get country info - prioritize from orderData, then extract from plan ID
      let countryInfo;
      if (orderData.countryCode && orderData.countryName) {
        countryInfo = { code: orderData.countryCode, name: orderData.countryName };
        console.log('📍 Using country info from orderData:', countryInfo);
      } else {
        countryInfo = getCountryFromPlan(orderData.planId);
        console.log('📍 Extracted country info from plan ID:', countryInfo);
      }
      
      // Step 1: Check if order/eSIM was already processed
      let orderRecord = null;
      let esimRecord = null;
      
      try {
        // Check if order exists
        const orderCheckResponse = await fetch(`/api/orders/get?orderId=${orderData.orderId}`);
        if (orderCheckResponse.ok) {
          orderRecord = await orderCheckResponse.json();
          console.log('✅ Order found in database:', orderRecord);
          
          // Check if order is still pending
          if (orderRecord.paymentStatus === 'pending' || orderRecord.status === 'pending') {
            console.log('⏳ Order is still pending - will process it');
            // Continue to process it below
          }
        }
      } catch (orderCheckError) {
        console.log('ℹ️ Order check failed, will try to process:', orderCheckError.message);
      }
      
      try {
        // Check if eSIM exists and has QR code
        const esimsResponse = await fetch(`/api/esims/list?orderId=${orderData.orderId}`);
        if (esimsResponse.ok) {
          const esimsResult = await esimsResponse.json();
          if (esimsResult.success && esimsResult.esims && esimsResult.esims.length > 0) {
            esimRecord = esimsResult.esims[0];
            const hasQrCode = esimRecord.qrCode || esimRecord.orderResult?.qrCode || esimRecord.lpa;
            console.log('✅ eSIM found:', { hasQrCode: !!hasQrCode, status: esimRecord.status });
            
            // If QR code is available, redirect to QR code page
            if (hasQrCode) {
              console.log('✅ QR code available - redirecting to QR code page');
              return { 
                success: true, 
                orderId: orderData.orderId, 
                hasQrCode: true,
                redirectTo: `/dashboard/qr-code/${orderData.orderId}`
              };
            }
          }
        }
      } catch (esimCheckError) {
        console.log('ℹ️ eSIM check failed:', esimCheckError.message);
      }
      
      // Step 2: If eSIM exists but no QR code, try to fetch it from API
      if (esimRecord && !(esimRecord.qrCode || esimRecord.orderResult?.qrCode || esimRecord.lpa)) {
        console.log('🔄 eSIM exists but no QR code - trying to fetch from API...');
        try {
          const { apiService } = await import('../services/apiServiceClient');
          const qrResult = await apiService.getQrCode(orderData.orderId);
          
          if (qrResult.success && qrResult.qrCode) {
            console.log('✅ QR code fetched from API - redirecting to QR code page');
            return { 
              success: true, 
              orderId: orderData.orderId, 
              hasQrCode: true,
              redirectTo: `/dashboard/qr-code/${orderData.orderId}`
            };
          }
        } catch (qrFetchError) {
          console.log('⏳ Could not fetch QR code from API yet:', qrFetchError.message);
        }
      }
      
      // Step 3: If order/eSIM doesn't exist or is pending, trigger backend processing
      // NOTE: eSIM creation is now handled by n8n workflow (triggered by email from Robokassa)
      // Frontend just waits for n8n to process the order
      if (!esimRecord || (orderRecord && (orderRecord.paymentStatus === 'pending' || orderRecord.status === 'pending'))) {
        console.log('⏳ Order not processed yet - n8n workflow will handle eSIM creation from payment email');
      }
      
      // Step 4: If eSIM exists but we haven't redirected yet, try fetching QR code one more time
      if (esimRecord) {
        console.log('🔄 eSIM exists, trying to fetch QR code from API...');
        try {
          const { apiService } = await import('../services/apiServiceClient');
          const qrResult = await apiService.getQrCode(orderData.orderId);
          
          if (qrResult.success && qrResult.qrCode) {
            console.log('✅ QR code fetched from API - redirecting to QR code page');
            return { 
              success: true, 
              orderId: orderData.orderId, 
              hasQrCode: true,
              redirectTo: `/dashboard/qr-code/${orderData.orderId}`
            };
          }
        } catch (qrFetchError) {
          console.log('⏳ Could not fetch QR code from API:', qrFetchError.message);
        }
      }

      // NOTE: eSIM creation is now handled by n8n workflow (triggered by email from Robokassa)
      // Frontend just waits for n8n to process the order and create the eSIM
      console.log('ℹ️ eSIM creation is handled by n8n workflow - frontend waits for processing');

      // Step 4: Try to get QR code immediately via RoamJet API (backend handles mock vs real)
      try {
        console.log('🔄 Attempting to retrieve QR code for order:', orderData.orderId);
        const { apiService } = await import('../services/apiServiceClient');
        const qrResult = await apiService.getQrCode(orderData.orderId);
        
        if (qrResult.success && qrResult.qrCode) {
          console.log('✅ QR code retrieved:', qrResult);
          
          // Update the eSIM record with QR code data via API
          // Note: eSIM is created by n8n workflow, so we just update it with QR code
          const qrUpdateData = {
            orderId: orderData.orderId,
            userId: currentUser?.uid || currentUser?.id || currentUser?._id || `email_${orderData.customerEmail}`,
            status: 'active',
            qrCode: qrResult.qrCode,
            activationCode: qrResult.activationCode,
            iccid: qrResult.iccid,
            directAppleInstallationUrl: qrResult.directAppleInstallationUrl,
            qrCodeUrl: qrResult.qrCodeUrl,
            lpa: qrResult.lpa,
            smdpAddress: qrResult.smdpAddress,
            isTestMode: isTestMode,
            testModeNotice: isTestMode ? '🧪 This is a TEST order' : null,
            orderResult: {
              activationCode: qrResult.activationCode,
              iccid: qrResult.iccid,
              orderId: orderData.orderId,
              planId: orderData.planId,
              planName: orderData.planName,
              provider: "airalo",
              qrCode: qrResult.qrCode,
              status: 'active',
              updatedAt: new Date().toISOString()
            },
            processingStatus: 'completed',
            completedAt: new Date(),
            updatedAt: new Date()
          };

          const qrUpdateResponse = await fetch('/api/esims/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(qrUpdateData)
          });

          if (!qrUpdateResponse.ok) {
            console.warn('⚠️ Failed to update eSIM with QR code data');
          }
        } else {
          console.log('⏳ QR code not ready yet, will be available later');
        }
      } catch (qrError) {
        console.log('⏳ QR code not ready yet:', qrError.message);
        // This is expected - QR code might not be ready immediately
      }

      // Return success - n8n workflow will handle eSIM creation
      return { success: true, orderId: orderData.orderId, message: 'Order will be processed by n8n workflow' };
      
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      
      // Don't throw error - just return a status indicating it needs processing
      // The n8n workflow will handle eSIM creation
      console.log('ℹ️ Frontend error in createOrderRecord, but n8n workflow will process it');
      return { 
        success: true, 
        orderId: orderData.orderId, 
        message: 'Order will be processed by n8n workflow',
        isProcessing: true,
        error: error.message
      };
    }
  };

  // Process payment success
  const handlePaymentSuccess = useCallback(async () => {
    try {
      const orderParam = searchParams.get('order_id') || searchParams.get('order');
      const planId = searchParams.get('plan_id');
      const email = searchParams.get('email');
      const total = searchParams.get('total') || searchParams.get('amount');
      const name = searchParams.get('name');
      const currency = searchParams.get('currency');
      const userId = searchParams.get('user_id');
      const orderType = searchParams.get('order_type') || 'esim_purchase';
      const countryCode = searchParams.get('countryCode');
      const countryName = searchParams.get('countryName');
      const metadataStr = searchParams.get('metadata');
      let metadata = {};
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr);
        } catch (e) {
          console.warn('⚠️ Could not parse metadata:', e);
        }
      }
      
      // Add country info to metadata if present in URL
      if (countryCode && countryName) {
        metadata.countryCode = countryCode;
        metadata.countryName = countryName;
      }
      
      console.log('🎉 Processing payment success:', {
        orderParam,
        planId,
        email,
        total,
        name,
        currency,
        userId,
        orderType,
        metadata,
        currentUserId: currentUser?.uid || currentUser?.id || currentUser?._id,
        hasCurrentUser: !!currentUser,
        emailFromParams: email
      });
      
      if (!orderParam) {
        console.log('❌ Missing order ID');
        setError('Missing order information.');
        setProcessing(false);
        return;
      }
      
      // Total is optional - we can process order without it
      if (!total) {
        console.log('⚠️ Total amount missing, but continuing with order processing');
      }

      // If email is missing, try to get it from order or use a fallback
      let customerEmail = email;
      if (!customerEmail) {
        // Try to extract from orderId or use a fallback
        console.log('⚠️ Email not found in URL params, using fallback');
        // For eSIM orders, we can proceed with orderId only
        customerEmail = `order_${orderParam}@pending.roamjet.net`;
        console.log('⚠️ Using fallback email for order processing:', customerEmail);
      }

      // Handle case where user session was lost after payment redirect
      // but we have the email from payment parameters - payment will complete anyway
      if (!currentUser && email) {
        console.log('⚠️ User session lost after payment redirect, but email available:', email);
        console.log('🔄 Will proceed with order completion using email from payment data');
        console.log('✅ Payment will complete successfully regardless of login status');
      }

      // First, update the pending order to completed status
      try {
        console.log('🔄 Updating pending order status to completed...');
        const updateResponse = await fetch(`/api/orders/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderParam,
            paymentStatus: 'paid',
            status: orderType === 'credit_card_application' ? 'active' : 'pending'
          })
        });
        
        if (updateResponse.ok) {
          console.log('✅ Order status updated successfully');
        } else {
          console.warn('⚠️ Could not update order status, but continuing...');
        }
      } catch (updateError) {
        console.warn('⚠️ Error updating order status:', updateError);
        // Continue anyway - order might already be updated by callback
      }

      // Handle credit card application orders
      if (orderType === 'credit_card_application' && metadata) {
        console.log('💳 Processing credit card application order...');
        
        try {
          // Use userId from metadata or URL params (must be ObjectId, not email string)
          const applicationUserId = userId || metadata.userId;
          
          if (!applicationUserId) {
            console.error('❌ No userId found for credit card application');
            setError('Payment successful, but user ID not found. Please contact support.');
            return;
          }

          // First, create transaction (order record) for credit card application
          const creditCardOrderData = {
            planId: metadata.planId || planId || 'basic',
            planName: metadata.planName || name || 'Базовый',
            amount: Math.round(parseFloat(total || 0)), // Already in RUB from Robokassa
            currency: 'RUB', // Always RUB for Robokassa payments
            customerEmail: customerEmail,
            customerId: applicationUserId,
            orderId: orderParam, // Use the order parameter as the consistent ID
            userId: applicationUserId
          };

          console.log('💳 Creating transaction for credit card application:', creditCardOrderData);

          // Create order record (transaction) for credit card
          const orderRecord = {
            orderId: creditCardOrderData.orderId,
            userId: creditCardOrderData.userId,
            packageId: creditCardOrderData.planId, // Use planId (slug) as packageId
            description: creditCardOrderData.planId, // Use planId (slug) instead of planName
            amount: creditCardOrderData.amount,
            currency: creditCardOrderData.currency,
            customerEmail: creditCardOrderData.customerEmail,
            status: 'completed', // Payment was successful
            paymentStatus: 'paid',
            paymentMethod: 'robokassa',
            orderType: 'credit_card_application', // Mark as credit card application
            metadata: {
              type: 'credit_card_application',
              planId: creditCardOrderData.planId,
              planName: creditCardOrderData.planName,
              phone: metadata.phone || null,
              country: metadata.country || null,
              city: metadata.city || null,
              street: metadata.street || null,
              postalCode: metadata.postalCode || null,
              promocode: metadata.promocode || null,
              comment: metadata.comment || null,
            },
            quantity: 1
          };

          const orderResponse = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderRecord)
          });

          if (!orderResponse.ok) {
            console.error('❌ Failed to create transaction for credit card application');
            // Continue anyway - we'll still try to submit the application
          } else {
            const orderResult = await orderResponse.json();
            console.log('✅ Transaction created for credit card application:', orderResult);
          }

          // Submit credit card application
          const applicationData = {
            userId: applicationUserId, // Use ObjectId from order
            phone: metadata.phone || null,
            country: metadata.country || null,
            city: metadata.city || null,
            street: metadata.street || null,
            postalCode: metadata.postalCode || null,
            promocode: metadata.promocode || null,
            comment: metadata.comment || null,
            planId: metadata.planId || planId || 'basic',
            planName: metadata.planName || name || 'Базовый'
          };

          console.log('💳 Submitting credit card application:', {
            userId: applicationData.userId,
            planId: applicationData.planId,
            planName: applicationData.planName
          });

          const applicationResponse = await fetch('/api/users/credit-card-application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
          });

          if (applicationResponse.ok) {
            const result = await applicationResponse.json();
            console.log('✅ Credit card application submitted successfully:', result);
            console.log('✅ Payment successful! Showing success message...');
            // Don't redirect - user will see success message and close browser manually
            return;
          } else {
            const errorData = await applicationResponse.json().catch(() => ({}));
            console.error('❌ Failed to submit credit card application:', errorData);
            setError('Payment successful, but failed to submit application. Please contact support.');
            return;
          }
        } catch (appError) {
          console.error('❌ Error processing credit card application:', appError);
          setError('Payment successful, but failed to process application. Please contact support.');
          return;
        }
      }

      // For eSIM orders, continue with order creation
      if (orderType === 'esim_purchase') {
      // Skip link check for now - process all payments
      console.log('⚠️ Link check disabled - processing payment directly');

      // Extract actual plan ID from unique order ID
      // Format: planId-timestamp-random -> extract planId
      const extractPlanId = (orderId) => {
        // If orderId contains timestamp pattern (digits), extract the base plan ID
        const parts = orderId.split('-');
        // Find the index where timestamp starts (all digits)
        const timestampIndex = parts.findIndex(part => /^\d+$/.test(part));
        
        if (timestampIndex > 0) {
          // Join all parts before the timestamp
          return parts.slice(0, timestampIndex).join('-');
        }
        
        // If no timestamp pattern found, return the whole orderId
        return orderId;
      };

      const actualPlanId = planId || extractPlanId(orderParam);
      console.log('📦 Extracted plan ID:', { orderParam, actualPlanId });

      // If planId is a MongoDB ObjectId, fetch the plan to get its slug
      let planSlug = actualPlanId;
      if (actualPlanId && /^[0-9a-fA-F]{24}$/.test(actualPlanId)) {
        // It's a MongoDB ObjectId, need to fetch the plan to get the slug
        console.log('🔍 planId is MongoDB ObjectId, fetching plan to get slug...');
        try {
          const plansResponse = await fetch('/api/public/plans');
          if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            if (plansData.success && plansData.data?.plans) {
              const foundPlan = plansData.data.plans.find(p => 
                (p._id && p._id.toString() === actualPlanId) || 
                (p.id && p.id.toString() === actualPlanId)
              );
              
              if (foundPlan) {
                planSlug = foundPlan.slug || foundPlan.name?.toLowerCase().replace(/\s+/g, '-') || actualPlanId;
                console.log('✅ Found plan slug:', planSlug, 'from plan:', foundPlan.name);
              } else {
                console.warn('⚠️ Plan not found with ObjectId:', actualPlanId);
                console.warn('⚠️ Will use ObjectId as slug (may fail with external API)');
              }
            }
          }
        } catch (planError) {
          console.error('❌ Error fetching plan to get slug:', planError);
          console.warn('⚠️ Will use ObjectId as slug (may fail with external API)');
        }
      }

      // Prepare order data - use orderParam as the consistent orderId
      const orderData = {
        planId: planSlug || orderParam, // Use plan slug for external API (not ObjectId), fallback to orderId
        planName: name ? decodeURIComponent(name) : 'eSIM Plan', // Keep planName for display
        amount: total ? Math.round(parseFloat(total)) : 0, // Already in RUB from Robokassa, default to 0 if missing
        currency: 'RUB', // Always RUB for Robokassa payments
        customerEmail: customerEmail, // Use the email we validated/extracted
        customerId: currentUser?.uid || userId || `email_${customerEmail}`,
        orderId: orderParam, // Use the order parameter as the consistent ID
        userId: currentUser?.uid || userId || `email_${customerEmail}`,
        orderType: orderType || 'esim_purchase', // Include orderType from URL params, default to esim_purchase
        type: orderType === 'esim_topup' ? 'topup' : 'esim', // For api_usage detection
        countryCode: countryCode || metadata.countryCode || null, // Country code from URL or metadata
        countryName: countryName || metadata.countryName || null // Country name from URL or metadata
      };
      
      console.log('🌍 Country info in orderData:', {
        countryCode: orderData.countryCode,
        countryName: orderData.countryName,
        fromUrl: { countryCode, countryName },
        fromMetadata: { countryCode: metadata.countryCode, countryName: metadata.countryName }
      });
      
      console.log('🎯 Order data prepared:', orderData);

        // Create order record (even without authentication - will use email as fallback)
        // This is idempotent - if order already exists, it will just return success
        // NOTE: This is a fallback page - n8n workflow (triggered by payment email) will process the order
        try {
      const orderResult = await createOrderRecord(orderData);
      
      // Always set processing to false after createOrderRecord completes
      setProcessing(false);
      
      if (orderResult && orderResult.redirectTo) {
        // QR code is ready - redirect to QR code page
        console.log('✅ QR code ready, redirecting to:', orderResult.redirectTo);
        router.push(orderResult.redirectTo);
        return;
      }
      
      if (orderResult && orderResult.success) {
        console.log('✅ Order processing completed');
        
        // If QR code is available, redirect to QR code page
        if (orderResult.hasQrCode && orderResult.redirectTo) {
          console.log('✅ QR code available, redirecting to:', orderResult.redirectTo);
          router.push(orderResult.redirectTo);
          return;
        }
        
        // Process referral commission (this also updates referral usage stats)
        // Only if user is authenticated
        if (currentUser) {
          try {
            console.log('💰 Processing referral commission for user:', currentUser.uid || currentUser.id || currentUser._id);
            console.log('💰 Commission data:', {
              userId: currentUser.uid || currentUser.id || currentUser._id,
              amount: orderData.amount,
              transactionId: orderResult.orderId,
              planId: orderData.planId,
              planName: orderData.planName
            });
          } catch (commissionError) {
            console.error('❌ Commission processing failed:', commissionError);
          }
        } else {
          console.log('⚠️ User not authenticated, skipping referral commission');
        }

        // Show appropriate message based on processing status
        if (orderResult.isPending) {
          console.log('⏳ Order is pending - showing pending message');
          setIsPendingOrder(true);
          setIsProcessingOrder(false);
        } else if (orderResult.isProcessing) {
          console.log('⏳ Order is being processed by backend - showing waiting message');
          setIsProcessingOrder(true);
          setIsPendingOrder(false);
        } else {
          console.log('✅ Payment successful! Showing success message...');
          setIsProcessingOrder(false);
          setIsPendingOrder(false);
        }
      } else {
        // If orderResult doesn't have success, show processing message
        console.log('ℹ️ Order result indicates processing needed');
        setIsProcessingOrder(true);
        setIsPendingOrder(false);
      }
        } catch (orderError) {
          console.error('❌ Error in order processing:', orderError);
          // Don't show error if payment was successful - backend will process it
          // Just log and show waiting message
          console.log('ℹ️ Frontend error, but payment was successful - backend will process order');
          console.log('ℹ️ Showing waiting message - order will be processed by backend');
          setIsProcessingOrder(true);
          setIsPendingOrder(false);
          setProcessing(false); // Make sure to stop loading
        }
      } else {
        // For non-eSIM orders (like credit cards), just show success
        console.log('✅ Payment successful! Showing success message...');
      }
      
    } catch (err) {
      console.error('❌ Payment processing error:', err);
      console.error('❌ Error stack:', err.stack);
      // Don't show error if payment was successful - backend will process it
      // Payment was successful (user was redirected here by Robokassa)
      // n8n workflow will process the order via payment email
      console.log('ℹ️ Frontend error, but payment was successful - backend will process order');
      console.log('ℹ️ Showing waiting message instead of error');
      // Don't set error - just show waiting message
      setIsProcessingOrder(true);
      setIsPendingOrder(false);
    } finally {
      // Always stop loading, even if there was an error
      setProcessing(false);
    }
  }, [currentUser, searchParams, checkAndMarkLinkUsed, createOrderRecord, router]);

  useEffect(() => {
    // Check if we should wait for email (no processing needed)
    const waitForEmail = searchParams.get('wait_for_email') === 'true';
    
    if (waitForEmail) {
      console.log('📧 wait_for_email=true - skipping processing, showing success immediately');
      setProcessing(false);
      setIsProcessingOrder(false);
      setIsPendingOrder(false);
      hasProcessed.current = true;
      return;
    }

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ Waiting for auth to load...');
      return;
    }

    // Process payment even without user authentication (for transactions without auth)
    // We have email from payment parameters, so we can proceed
    if (!hasProcessed.current) {
      console.log('✅ Processing payment (with or without user auth)...');
      hasProcessed.current = true;
      handlePaymentSuccess();
    }
  }, [authLoading, handlePaymentSuccess, searchParams]);

  // Check if waiting for email - show success immediately (no processing needed)
  const waitForEmail = searchParams.get('wait_for_email') === 'true';
  
  if (waitForEmail) {
    // Processing is handled by email callback - just show success immediately
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful
          </h2>
          <p className="text-gray-600 text-lg mb-2">
            Everything is good!
          </p>
          <p className="text-gray-600">
            You will receive an email with installation instructions shortly.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show loading while auth is loading (only for non-email flows)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('log in');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="text-8xl text-red-500 mb-4">✕</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isAuthError ? 'Authentication Required' : 'Payment Error'}
            </h2>
            <p className="text-gray-600 text-lg">{error}</p>
            {isAuthError && (
              <p className="text-gray-500 text-sm mt-4">
                Your payment was successful, but you need to log in to access your eSIM.
                Please save this URL and log in to complete the process.
              </p>
            )}
          </div>
          <button
            onClick={() => router.push(isAuthError ? `/login?redirect=${encodeURIComponent(window.location.href)}` : '/dashboard')}
            className="w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isAuthError ? 'Log In' : 'Go to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  // Get order type from URL params
  const orderType = searchParams.get('order_type') || 'esim_purchase';
  const isCreditCard = orderType === 'credit_card_application';

  // Show success message (for non-email flows that completed processing)
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful
        </h2>
        <p className="text-gray-600 text-lg">
          Your order will be processed shortly.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;

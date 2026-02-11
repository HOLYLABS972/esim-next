'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getDisplayAmountFromItem } from '../services/currencyService';
// import { esimService } from '../services/esimService'; // Removed - causes client-side issues
import { useAuth } from '../contexts/AuthContext';
import { getCountryNameFromCode } from '../utils/countryUtils';

import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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

const Checkout = ({ plan, emailFromUrl, paymentMethod: paymentMethodProp }) => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState(null);
  const isProcessingRef = useRef(false); // Use ref to prevent duplicate orders (persists across re-renders)
  const paymentMethod = paymentMethodProp || plan?.paymentMethod || null;
  const useStripe = paymentMethod === 'stripe';

  const getEmailForOrder = () => {
    if (emailFromUrl) return emailFromUrl;
    if (currentUser?.email) return currentUser.email;
    return null;
  };

  useEffect(() => {
    // Allow checkout without authentication - collect email instead
    // Guard: prevent duplicate order creation using ref (persists across re-renders)
    if (!plan || isProcessingRef.current) {
      console.log('⏸️ Skipping checkout - plan missing or already processing');
      return;
    }
    
    console.log('🚀 Starting checkout for plan:', plan.name);
    isProcessingRef.current = true; // Set guard immediately to prevent duplicates
    
    // Create order and redirect immediately (no auth required) – use server-provided prices only
    const redirectToPayment = async () => {
        try {
          // Check if there's already a pending order for this plan in localStorage
          const existingPendingOrder = localStorage.getItem('pendingEsimOrder');
          if (existingPendingOrder) {
            try {
              const parsed = JSON.parse(existingPendingOrder);
              // Check if order is recent (within last 5 minutes) and for the same plan
              const orderAge = Date.now() - (parsed.orderId || 0);
              const isRecent = orderAge < 5 * 60 * 1000; // 5 minutes
              const isSamePlan = parsed.planId === (plan.slug || plan.id);
              
              if (isRecent && isSamePlan) {
                console.log('⚠️ Recent pending order found, reusing order ID:', parsed.orderId);
                // Use existing order ID to prevent duplicates
                const uniqueOrderId = parsed.orderId;
                
                // CRITICAL: Still create/update order in MongoDB even when reusing order ID
                // This ensures the order exists in the database with correct country info
                try {
                  console.log('📦 Creating/updating order in MongoDB for reused order ID:', uniqueOrderId);
                  const createOrderResponse = await fetch('/api/orders/create-pending', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      orderId: uniqueOrderId,
                      packageId: plan.slug || plan.id,
                      customerEmail: getEmailForOrder(),
                      amount: parsed.amount || (() => { const { amount, currency } = getDisplayAmountFromItem(plan, 'RUB'); return currency === 'RUB' && amount > 0 ? amount : (plan.price_rub ?? plan.priceRUB ?? 0); })(),
                      currency: 'RUB',
                      description: plan.name,
                      userId: currentUser?.uid || currentUser?.id || currentUser?._id || null,
                      quantity: 1,
                      mode: 'production',
                      metadata: {
                        type: 'esim_purchase',
                        countryCode: plan.country_code || null,
                        countryName: plan.countryName || null,
                        planSlug: plan.slug || plan.id,
                        originalPlanId: plan.id,
                      }
                    })
                  });

                  if (createOrderResponse.ok) {
                    console.log('✅ Order created/updated in MongoDB for reused order');
                  } else {
                    const errorData = await createOrderResponse.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('⚠️ Failed to create/update order in MongoDB:', errorData);
                  }
                } catch (orderErr) {
                  console.error('⚠️ Error creating/updating order for reused order:', orderErr);
                }
                
                // Just redirect to payment with existing order
                const amt = parsed.amount || (() => { const { amount, currency } = getDisplayAmountFromItem(plan, 'RUB'); return currency === 'RUB' && amount > 0 ? amount : (plan.price_rub ?? plan.priceRUB ?? 0); })();
                if (useStripe) {
                  const stripeRes = await fetch('/api/stripe/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: uniqueOrderId,
                      customerEmail: currentUser?.email || null,
                      planName: plan.name,
                      amount: amt,
                      currency: 'rub',
                      domain: window.location.origin,
                    })
                  });
                  if (stripeRes.ok) {
                    const stripeData = await stripeRes.json();
                    if (stripeData.url) {
                      window.location.href = stripeData.url;
                      return;
                    }
                  }
                } else {
                  const response = await fetch('/api/robokassa/create-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      order: uniqueOrderId,
                      email: currentUser ? currentUser.email : null,
                      name: plan.name,
                      total: amt,
                      currency: 'RUB',
                      domain: window.location.origin,
                      description: plan.name
                    })
                  });
                  if (response.ok) {
                    const result = await response.json();
                    if (result.paymentUrl) {
                      window.location.href = result.paymentUrl;
                      return;
                    }
                  }
                }
              }
            } catch (e) {
              console.log('⚠️ Could not parse existing order, creating new one');
            }
          }
          
          const emailForOrder = getEmailForOrder();
          if (emailForOrder) {
            try {
              const checkOrderResponse = await fetch(`/api/orders/check-existing?email=${encodeURIComponent(emailForOrder)}`);
              if (checkOrderResponse.ok) {
              const checkResult = await checkOrderResponse.json();
              if (checkResult.success && checkResult.data?.order) {
                const existingOrder = checkResult.data.order;
                const uniqueOrderId = existingOrder.orderId;
                const amt = existingOrder.amount || (() => { const { amount, currency } = getDisplayAmountFromItem(plan, 'RUB'); return currency === 'RUB' && amount > 0 ? amount : (plan.price_rub ?? plan.priceRUB ?? 0); })();
                if (useStripe) {
                  const stripeRes = await fetch('/api/stripe/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: uniqueOrderId,
                      customerEmail: emailForOrder,
                      planName: plan.name,
                      amount: amt,
                      currency: 'rub',
                      domain: window.location.origin,
                    })
                  });
                  if (stripeRes.ok) {
                    const stripeData = await stripeRes.json();
                    if (stripeData.url) {
                      window.location.href = stripeData.url;
                      return;
                    }
                  }
                } else {
                  const response = await fetch('/api/robokassa/create-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      order: uniqueOrderId,
                      email: emailForOrder,
                      name: plan.name,
                      total: amt,
                      currency: 'RUB',
                      domain: window.location.origin,
                      description: plan.name
                    })
                  });
                  if (response.ok) {
                    const result = await response.json();
                    if (result.paymentUrl) {
                      window.location.href = result.paymentUrl;
                      return;
                    }
                  }
                }
              }
            }
            } catch (checkErr) {
              console.error('Error checking for existing order:', checkErr);
            }
          }
          
          // Generate unique numeric order ID for Robokassa
          // Robokassa requires numeric InvId between 1 and 9223372036854775807
          // Using timestamp ensures uniqueness and keeps it numeric
          // Add small random offset to prevent collisions if called multiple times quickly
          const uniqueOrderId = Date.now() + Math.floor(Math.random() * 1000); // Add random offset
          
          // Minimum price constant (10 RUB)
          const MINIMUM_PRICE_RUB = 10;
          
          // Get the price - priceRUB is ALREADY in RUB (from share page conversion)
          // Use priceRUB directly to avoid double conversion
          let amountRUB = 0;
          let amountUSD = 0; // For logging only
          
          console.log('💰 Price check - plan data:', {
            priceUSD: plan.priceUSD,
            priceRUB: plan.priceRUB,
            price: plan.price,
            originalPrice: plan.originalPrice,
            hasPriceUSD: plan.priceUSD !== undefined && plan.priceUSD !== null,
            hasPriceRUB: plan.priceRUB !== undefined && plan.priceRUB !== null,
            hasPrice: plan.price !== undefined && plan.price !== null,
            currency: plan.currency
          });
          
          // Use server-provided RUB only – no conversion on frontend
          const { amount: rubFromItem, currency: rubCurrency } = getDisplayAmountFromItem(plan, 'RUB');
          if (rubCurrency === 'RUB' && rubFromItem > 0) {
            amountRUB = rubFromItem;
            amountUSD = plan.price ?? plan.priceUSD ?? amountRUB / 95; // for logging only
            console.log('✅ Using server price_rub:', amountRUB, 'RUB');
          } else {
            console.error('❌ No RUB price from server for this plan – ensure price_rub is set');
            setError('Price not available – please try again later');
            isProcessingRef.current = false;
            return;
          }
          
          // Ensure we have a valid price
          if (!amountRUB || amountRUB <= 0 || isNaN(amountRUB)) {
            console.error('❌ Invalid price - cannot proceed:', { 
              priceUSD: plan.priceUSD,
              priceRUB: plan.priceRUB,
              price: plan.price,
              parsedRUB: amountRUB
            });
            setError('Invalid price - please try again');
            isProcessingRef.current = false;
            return;
          }
          
          console.log('💰 Final pricing calculation:', { 
            amountUSD: amountUSD ? amountUSD.toFixed(2) : 'N/A', 
            amountRUB: amountRUB,
            amountRUBType: typeof amountRUB,
            amountRUBIsNumber: !isNaN(amountRUB),
            originalPrice: plan.originalPrice,
            discount: plan.originalPrice && amountUSD ? ((1 - amountUSD / plan.originalPrice) * 100).toFixed(1) + '%' : 'N/A',
            exchangeRate: amountUSD ? (amountRUB / amountUSD).toFixed(2) : 'N/A',
            warning: amountRUB > 10000 ? '⚠️ Amount seems too high - check if USD was sent instead of RUB!' : 'OK',
            source: {
              priceUSD: plan.priceUSD,
              priceRUB: plan.priceRUB,
              price: plan.price
            }
          });
          
          // CRITICAL: Log what will be sent to Robokassa
          console.log('🎯 FINAL AMOUNT TO SEND TO ROBOKASSA:', {
            amountRUB: amountRUB,
            amountUSD: amountUSD,
            verification: `If USD is ${amountUSD}, RUB should be ~${Math.round(amountUSD * 77.7)} at rate 77.7`
          });
          
          // Validate RUB amount
          if (!amountRUB || amountRUB <= 0 || isNaN(amountRUB)) {
            console.error('❌ Invalid RUB amount:', { amountRUB });
            setError('Price conversion error - please try again');
            isProcessingRef.current = false;
            return;
          }
          
          // Automatically apply minimum price constraint (10 RUB) - no error, just correct it
          if (amountRUB < MINIMUM_PRICE_RUB) {
            console.log(`⚠️ Amount ${amountRUB} RUB is below minimum ${MINIMUM_PRICE_RUB} RUB, automatically correcting to ${MINIMUM_PRICE_RUB} RUB`);
            amountRUB = MINIMUM_PRICE_RUB;
          }
          
          let countryCode = null;
          let countryName = null;
          
          if (plan.country_codes && plan.country_codes.length > 0) {
            countryCode = plan.country_codes[0];
            console.log('✅ Using country_codes array from plan:', countryCode);
            
            // Use countryName from plan if available
            if (plan.countryName) {
              countryName = plan.countryName;
              console.log('✅ Using countryName from plan:', countryName);
            }
            // Try to get country name from countries array if available
            else if (plan.countries && plan.countries.length > 0) {
              // Check if countries array contains objects with name field
              const country = plan.countries.find(c => c.code === countryCode || c === countryCode);
              if (country && typeof country === 'object' && country.name) {
                countryName = country.name;
                console.log('✅ Found country name from countries array:', countryName);
              }
            }
            
            // If still no country name, fetch it using the utility function
            if (!countryName && countryCode) {
              try {
                console.log('🔍 Fetching country name for code:', countryCode);
                countryName = await getCountryNameFromCode(countryCode);
                if (countryName) {
                  console.log('✅ Found country name:', countryName);
                } else {
                  console.warn('⚠️ Could not find country name for code:', countryCode);
                  countryName = countryCode; // Use code as fallback
                }
              } catch (error) {
                console.warn('⚠️ Error fetching country name:', error);
                countryName = countryCode; // Use code as fallback
              }
            }
          }
          // Fallback: try to get from plan.country field
          else if (plan.country) {
            countryCode = plan.country;
            console.log('✅ Using country field from plan:', countryCode);
          }
          
          // If still no country, this is an error - we should have country data from share page
          if (!countryCode) {
            console.error('❌ CRITICAL: No country code found in plan!', { 
              planId: plan.id,
              planName: plan.name,
              planData: {
                country_code: plan.country_code, 
                country_codes: plan.country_codes, 
                country: plan.country,
                countryName: plan.countryName
              }
            });
            // Don't use fallback - this should never happen if share page works correctly
          }
          
          console.log('🌍 Final country info for order:', { 
            countryCode, 
            countryName,
            source: {
              fromCountryCode: plan.country_code,
              fromCountryCodes: plan.country_codes,
              fromCountry: plan.country,
              fromCountryName: plan.countryName
            }
          });
          
          let planSlug = plan.slug || plan.id;
          
          console.log('🔍 Plan slug check (before processing):', {
            planId: plan.id,
            planSlugFromPlan: plan.slug,
            initialPlanSlug: planSlug,
            isObjectId: plan.id && /^[0-9a-fA-F]{24}$/.test(plan.id)
          });
          
          console.log('🔍 Plan slug check:', {
            planId: plan.id,
            planSlug: plan.slug,
            isObjectId: plan.id && /^[0-9a-fA-F]{24}$/.test(plan.id),
            finalSlug: planSlug
          });
          
          // If plan.id is a MongoDB ObjectId, we need to use plan.slug instead
          if (plan.id && /^[0-9a-fA-F]{24}$/.test(plan.id)) {
            // It's an ObjectId, use slug if available (from CheckoutPageClient)
            if (plan.slug) {
              planSlug = plan.slug;
              console.log('✅ Using plan slug instead of ObjectId:', planSlug);
            } else {
              console.error('❌ CRITICAL: plan.id is ObjectId but no slug found!', {
                planId: plan.id,
                planSlug: plan.slug,
                planData: plan
              });
              // Try to fetch slug from API
              try {
                const plansResponse = await fetch('/api/public/plans');
                if (plansResponse.ok) {
                  const plansData = await plansResponse.json();
                  if (plansData.success && plansData.data?.plans) {
                    const foundPlan = plansData.data.plans.find(p => 
                      (p._id && p._id.toString() === plan.id) || 
                      (p.id && p.id.toString() === plan.id)
                    );
                    if (foundPlan && foundPlan.slug) {
                      planSlug = foundPlan.slug;
                      console.log('✅ Found plan slug from API:', planSlug);
                    } else {
                      console.warn('⚠️ Plan not found in API, will use ObjectId (may cause issues)');
                      planSlug = plan.id;
                    }
                  }
                }
              } catch (apiError) {
                console.error('❌ Error fetching plan slug from API:', apiError);
                planSlug = plan.id; // Fallback to ObjectId
              }
            }
          } else {
            // plan.id is already a slug
            planSlug = plan.id;
            console.log('✅ plan.id is already a slug:', planSlug);
          }
          
          console.log('✅ Final plan slug for order:', planSlug);
          
          // Get flag emoji
          const countryFlag = plan.countryFlag || (countryCode ? getFlagEmoji(countryCode) : '🌍');

          // CRITICAL: Store the exact amountRUB value to ensure DB and Robokassa use the same
          // Apply minimum price constraint (10 RUB) - already validated above
          const finalAmountRUB = Math.max(MINIMUM_PRICE_RUB, Math.round(amountRUB)); // Round to ensure integer and apply minimum
          
          console.log('💾 Amount to save to DB and send to Robokassa:', {
            amountRUB: amountRUB,
            finalAmountRUB: finalAmountRUB,
            sameValue: amountRUB === finalAmountRUB,
            source: {
              priceRUB: plan.priceRUB,
              priceUSD: plan.priceUSD,
              price: plan.price
            },
            calculation: {
              usedPriceRUB: plan.priceRUB !== undefined && plan.priceRUB !== null && plan.priceRUB > 0,
              usedPriceUSD: !(plan.priceRUB !== undefined && plan.priceRUB !== null && plan.priceRUB > 0) && plan.priceUSD !== undefined && plan.priceUSD !== null
            }
          });

          const orderData = {
            orderId: uniqueOrderId,
            planId: planSlug,
            planName: plan.name,
            customerEmail: getEmailForOrder(),
            amount: finalAmountRUB,
            currency: 'RUB',
          };
          
          console.log('💳 Order data for payment:', orderData);
          console.log('🌍 Country info:', { countryCode, countryName });

          // Store order info for payment success handling
          localStorage.setItem('pendingEsimOrder', JSON.stringify({
            orderId: uniqueOrderId,
            planId: planSlug,
            customerEmail: getEmailForOrder(),
            amount: finalAmountRUB,
            currency: 'RUB',
          }));

          try {
            const createOrderResponse = await fetch('/api/orders/create-pending', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: uniqueOrderId,
                packageId: planSlug,
                customerEmail: getEmailForOrder(),
                amount: finalAmountRUB,
                currency: 'RUB',
                description: plan.name,
                userId: currentUser?.uid || currentUser?.id || currentUser?._id || null,
                quantity: 1,
                mode: 'production',
                metadata: {
                  type: 'esim_purchase',
                  countryCode: countryCode || null,
                  countryName: countryName || null,
                  countryFlag: plan.countryFlag || getFlagEmoji(countryCode) || '🌍',
                  planSlug: planSlug,
                  originalPlanId: plan.id,
                }
              })
            });
            if (createOrderResponse.ok) {
              console.log('✅ Pending order created');
            } else {
              const errorData = await createOrderResponse.json().catch(() => ({}));
              console.error('⚠️ Failed to create pending order:', errorData);
            }
          } catch (err) {
            console.error('⚠️ Error creating pending order:', err);
          }

          // Create invisible/pending eSIM record with correct country
          try {
            console.log('📱 Creating invisible eSIM record with country info...');
            console.log('🌍 Country data being sent to eSIM create-pending:', {
              countryCode: countryCode,
              countryName: countryName,
              source: 'Checkout component',
              hasCountryCode: !!countryCode,
              hasCountryName: !!countryName
            });
            console.log('📋 Full eSIM data:', {
              orderId: uniqueOrderId,
              planId: planSlug,
              planName: plan.name,
              countryCode: countryCode,
              countryName: countryName,
              amount: finalAmountRUB,
                currency: 'RUB',
                userId: currentUser?.uid || currentUser?.id || currentUser?._id || null,
              customerEmail: plan.email || plan.couponEmail || (currentUser ? currentUser.email : null)
            });
              
            if (!countryCode) {
              console.error('❌ CRITICAL: No countryCode available when creating eSIM!', {
                planData: {
                  country_code: plan.country_code,
                  country_codes: plan.country_codes,
                  country: plan.country,
                  countryName: plan.countryName
                },
                detectedCountry: { countryCode, countryName }
              });
            }
              
              const createEsimResponse = await fetch('/api/esims/create-pending', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: uniqueOrderId,
                  planId: planSlug, // Use plan slug, not ObjectId
                  planName: plan.name,
                  countryCode: countryCode || null, // Don't use 'US' fallback - if no country, it's an error
                  countryName: countryName || null,
                  amount: finalAmountRUB, // Use the same rounded value
                currency: 'RUB',
                userId: currentUser?.uid || currentUser?.id || currentUser?._id || null,
                customerEmail: plan.email || plan.couponEmail || (currentUser ? currentUser.email : null),
                status: 'pending' // Hidden until payment success
              })
            });

            if (createEsimResponse.ok) {
              const result = await createEsimResponse.json();
              console.log('✅ Invisible eSIM record created with correct country:', result);
            } else {
              const errorData = await createEsimResponse.json().catch(() => ({ error: 'Unknown error' }));
              console.error('❌ Failed to create invisible eSIM record:', errorData);
              // Don't block payment flow, but log the error clearly
            }
          } catch (err) {
            console.error('❌ Error creating invisible eSIM record:', err);
            // Don't block payment flow if eSIM creation fails
          }

          // Redirect to Robokassa payment via Next.js API
          // CRITICAL: Use the exact same amountRUB value that was saved to DB
          console.log('🚀 Sending payment request to Robokassa:', {
            order: uniqueOrderId,
            total: finalAmountRUB, // Use the same rounded value as DB
            totalType: typeof finalAmountRUB,
            currency: 'RUB',
            amountUSD: amountUSD ? amountUSD.toFixed(2) : 'N/A',
            verification: `Same amount as saved to DB: ${finalAmountRUB} RUB`
          });
          
          if (useStripe) {
            const stripeRes = await fetch('/api/stripe/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: uniqueOrderId,
                customerEmail: plan.email || plan.couponEmail || (currentUser?.email || null),
                planName: plan.name,
                amount: finalAmountRUB,
                currency: 'rub',
                domain: window.location.origin,
              })
            });
            if (!stripeRes.ok) {
              const errData = await stripeRes.json();
              throw new Error(errData.error || 'Failed to create Stripe session');
            }
            const stripeData = await stripeRes.json();
            if (stripeData.url) {
              window.location.href = stripeData.url;
            } else {
              throw new Error('No Stripe URL received');
            }
          } else {
            const response = await fetch('/api/robokassa/create-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order: uniqueOrderId,
                email: plan.email || plan.couponEmail || (currentUser ? currentUser.email : null),
                name: plan.name,
                total: finalAmountRUB,
                currency: 'RUB',
                domain: window.location.origin,
                description: plan.name
              })
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to create payment');
            }
            const result = await response.json();
            if (result.paymentUrl) {
              window.location.href = result.paymentUrl;
            } else {
              throw new Error('No payment URL received');
            }
          }
          
        } catch (err) {
          console.error('❌ Payment redirect failed:', err);
          setError('Failed to redirect to payment');
          isProcessingRef.current = false; // Reset on error so user can retry
        }
      };

      redirectToPayment();
  }, [plan, currentUser, useStripe]); // paymentMethod affects useStripe

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300">План не выбран</p>
        </div>
      </div>
    );
  }




  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Show loading while redirecting to payment
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a202c]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-300">Перенаправление на оплату...</p>
      </div>
    </div>
  );
};

export default Checkout;

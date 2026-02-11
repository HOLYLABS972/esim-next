import { loadStripe } from '@stripe/stripe-js';

// Server payments service URL - payments go to pay.roamjet.net
const SERVER_PAYMENTS_URL = 'https://pay.roamjet.net';

// Stripe instance cache
let stripeInstance = null;
let currentStripeMode = null;

// Get or initialize Stripe with the correct key for current mode
async function getStripeInstance() {
  try {
    // Use environment variables instead of configService to avoid MongoDB connections
    const mode = process.env.NEXT_PUBLIC_STRIPE_MODE || 'test';
    let publishableKey = mode === 'live' 
      ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE
      : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST;
    
    // Fallback to hardcoded test key if no environment key is found
    // NOTE: This is a test key only - should be moved to environment variables
    // Test keys are safe to expose but best practice is to use env vars
    if (!publishableKey && mode === 'test') {
      publishableKey = 'pk_test_51QgvHMDAQpPJFhcuO3sh2pE1JSysFYHgJo781w5lzeDX6Qh9P026LaxpeilCyXx73TwCLHcF5O0VQU45jPZhLBK800G6bH5LdA';
      console.warn('⚠️ Using fallback Stripe test key - consider using NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST env variable');
    }
    
    // If mode changed, reinitialize Stripe
    if (mode !== currentStripeMode || !stripeInstance) {
      currentStripeMode = mode;
      
      if (publishableKey) {
        console.log(`🔑 Loading Stripe in ${mode.toUpperCase()} mode`);
        stripeInstance = await loadStripe(publishableKey);
      } else {
        console.warn('⚠️ No Stripe publishable key found');
        stripeInstance = null;
      }
    }
    
    return stripeInstance;
  } catch (error) {
    console.error('❌ Error loading Stripe:', error);
    return null;
  }
}

export const paymentService = {
  // Create payment intent and redirect to external payment page
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      console.log('🔍 Creating payment redirect with:', { amount, currency, metadata });
      
      // Use direct API instead of Firebase Functions
      const response = await fetch(`${SERVER_PAYMENTS_URL}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: currency,
          metadata: metadata,
          automatic_payment_methods: {
            enabled: true,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const { client_secret } = await response.json();
      console.log('✅ Payment intent created successfully');
      
      return { client_secret };
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw error;
    }
  },

  // Create checkout session for Stripe Checkout
  async createCheckoutSession(orderData) {
    try {
      console.log('🛒 Creating checkout session:', orderData);
      
      // Transform orderData to match your Flask app's expected format
      const flaskPayload = {
        order: orderData.orderId || orderData.planId,
        email: orderData.customerEmail,
        name: orderData.planName,
        total: orderData.amount,
        currency: orderData.currency || 'usd',
        domain: window.location.origin
      };
      
      console.log('🔄 Transformed payload for Flask app:', flaskPayload);
      
      // Use your Flask payment service TEST endpoint for one-time orders
      const response = await fetch(`${SERVER_PAYMENTS_URL}/test/create-payment-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(flaskPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Flask payment response:', result);
      
      // Extract sessionUrl from your Flask app response format
      // test/create-payment-order returns: {'sessionUrl': session.url, 'sessionId': session.id, 'status': 'success'}
      const sessionUrl = result.sessionUrl;
      const sessionId = result.sessionId;
      
      if (!sessionUrl) {
        console.error('❌ No sessionUrl in response:', result);
        throw new Error('No session URL returned from payment service');
      }
      
      if (result.status !== 'success') {
        throw new Error(result.error || 'Payment session creation failed');
      }
      
      // Redirect to Stripe checkout with iframe detection (copied from esim-shop)
      console.log('🔄 Redirecting to Stripe checkout for single order:', sessionUrl);
      
      // Check if we're in an iframe
      if (window !== window.top) {
        console.log('🔗 Detected iframe context - redirecting parent window');
        // Redirect the parent window instead of the iframe
        try {
          window.top.location.href = sessionUrl;
        } catch (error) {
          console.warn('⚠️ Cannot redirect parent window, trying alternative method');
          // Alternative: open in new window
          window.open(sessionUrl, '_blank');
        }
      } else {
        console.log('🖥️ Normal window context - redirecting current window');
        window.location.href = sessionUrl;
      }
      
      return { 
        sessionId: sessionId,
        url: sessionUrl 
      };
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      
      // If CORS error, provide helpful message
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        throw new Error('Payment service is not configured for this domain. Please contact support.');
      }
      
      throw error;
    }
  },

  // Redirect to Stripe Checkout
  async redirectToCheckout(sessionId) {
    try {
      const stripe = await getStripeInstance();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      console.log('🔄 Redirecting to Stripe Checkout...');
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('❌ Error redirecting to checkout:', error);
      throw error;
    }
  },

  // Process payment with Stripe Elements
  async processPayment(clientSecret, paymentMethod) {
    try {
      const stripe = await getStripeInstance();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      console.log('💳 Processing payment...');
      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        paymentMethod,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
      });

      if (error) {
        throw error;
      }

      console.log('✅ Payment processed successfully:', paymentIntent);
      return paymentIntent;
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      throw error;
    }
  },

  // Get Stripe instance for custom implementations
  async getStripe() {
    return await getStripeInstance();
  }
};

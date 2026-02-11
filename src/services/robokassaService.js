// Browser-compatible MD5 hash function
function md5(string) {
  function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }
  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }
  function md51(s) {
    var n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
    for (i = 0; i < s.length; i++)
      tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
    tail[i>>2] |= 0x80 << ((i%4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n*8;
    md5cycle(state, tail);
    return state;
  }
  function md5blk(s) {
    var md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i>>2] = s.charCodeAt(i)
        + (s.charCodeAt(i+1) << 8)
        + (s.charCodeAt(i+2) << 16)
        + (s.charCodeAt(i+3) << 24);
    }
    return md5blks;
  }
  var hex_chr = '0123456789abcdef'.split('');
  function rhex(n) {
    var s='', j=0;
    for(; j<4; j++)
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
        + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
  }
  function hex(x) {
    for (var i=0; i<x.length; i++)
      x[i] = rhex(x[i]);
    return x.join('');
  }
  function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
  }
  return hex(md51(string));
}

// Robokassa configuration - using NEXT_PUBLIC_ prefix for client-side access
const ROBOKASSA_CONFIG = {
  merchantLogin: process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN || 'your_merchant_login',
  passOne: process.env.NEXT_PUBLIC_ROBOKASSA_PASS_ONE || 'your_pass_one',
  passTwo: process.env.NEXT_PUBLIC_ROBOKASSA_PASS_TWO || 'your_pass_two',
  mode: process.env.NEXT_PUBLIC_ROBOKASSA_MODE || 'test', // test or production
  baseUrl: process.env.NEXT_PUBLIC_ROBOKASSA_BASE_URL || 'https://auth.robokassa.ru/Merchant/Index.aspx'
};


// Server payments service URL - payments go to pay.roamjet.net
const SERVER_PAYMENTS_URL = 'https://pay.roamjet.net';

/**
 * Generate MD5 hash for Robokassa signature
 */
function generateSignature(params, password) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join(':');
  
  const signatureString = `${sortedParams}:${password}`;
  return md5(signatureString);
}

/**
 * Generate Robokassa payment URL
 */
function generatePaymentUrl(orderData) {
  const {
    orderId,
    amount,
    description,
    email,
    currency = 'RUB',
    culture = 'ru',
    successUrl,
    failUrl
  } = orderData;

  // Convert amount to kopecks (Robokassa uses kopecks)
  const amountInKopecks = Math.round(amount * 100);

  const params = {
    MerchantLogin: ROBOKASSA_CONFIG.merchantLogin,
    OutSum: amountInKopecks,
    InvId: orderId,
    Description: description,
    Email: email,
    Culture: culture,
    Encoding: 'utf-8',
    SignatureValue: ''
  };

  // Add IsTest parameter for test mode
  if (ROBOKASSA_CONFIG.mode === 'test') {
    params.IsTest = 1;
  }

  // Add success and fail URLs if provided
  if (successUrl) {
    params.SuccessURL = successUrl;
  }
  if (failUrl) {
    params.FailURL = failUrl;
  }

  // Generate signature
  params.SignatureValue = generateSignature(params, ROBOKASSA_CONFIG.passOne);

  // Build URL
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return `${ROBOKASSA_CONFIG.baseUrl}?${queryString}`;
}

/**
 * Verify Robokassa callback signature
 */
function verifyCallbackSignature(params) {
  const { OutSum, InvId, SignatureValue } = params;
  
  const verificationParams = {
    OutSum,
    InvId,
    PassTwo: ROBOKASSA_CONFIG.passTwo
  };

  const expectedSignature = generateSignature(verificationParams, ROBOKASSA_CONFIG.passTwo);
  return expectedSignature.toLowerCase() === SignatureValue.toLowerCase();
}

export const robokassaService = {
  /**
   * Create payment and redirect to Robokassa
   */
  async createPayment(orderData) {
    try {
      console.log('🔄 Creating Robokassa payment:', orderData);
      
      const paymentUrl = generatePaymentUrl({
        orderId: orderData.orderId,
        amount: orderData.amount,
        description: orderData.description || orderData.planName || 'eSIM Package',
        email: orderData.customerEmail,
        currency: orderData.currency || 'RUB',
        successUrl: `${window.location.origin}/payment-success?order=${orderData.orderId}`,
        failUrl: `${window.location.origin}/payment-failed?order=${orderData.orderId}`
      });

      console.log('✅ Robokassa payment URL generated:', paymentUrl);
      
      // Redirect to Robokassa payment page
      window.location.href = paymentUrl;
      
      return { paymentUrl, success: true };
    } catch (error) {
      console.error('❌ Error creating Robokassa payment:', error);
      throw error;
    }
  },

  /**
   * Create payment via server (for single orders)
   */
  async createCheckoutSession(orderData) {
    try {
      const endpoint = '/create-robokassa-payment';
      console.log('🔍 Creating Robokassa payment via server:', orderData);
      console.log('🌐 Payment server URL:', SERVER_PAYMENTS_URL);
      console.log('🎯 Using endpoint:', endpoint);
      
      const response = await fetch(`${SERVER_PAYMENTS_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: orderData.orderId,
          email: orderData.customerEmail,
          name: orderData.planName,
          plan_id: orderData.planId,  // Include plan ID for success callback
          total: orderData.amount,
          currency: orderData.currency || 'RUB',
          domain: window.location.origin,
          description: orderData.description || orderData.planName || 'eSIM Package'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Robokassa payment created via server:', result);
      
      // Redirect to Robokassa payment page
      if (result.paymentUrl) {
        console.log('🔄 Redirecting to Robokassa payment page:', result.paymentUrl);
        window.location.href = result.paymentUrl;
      } else {
        console.error('❌ Server response missing paymentUrl:', result);
        throw new Error('No payment URL received from server');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error creating Robokassa checkout session:', error);
      throw error;
    }
  },

  /**
   * Verify payment callback from Robokassa
   */
  async verifyPayment(params) {
    try {
      console.log('🔍 Verifying Robokassa payment:', params);
      
      const isValid = verifyCallbackSignature(params);
      
      if (isValid) {
        console.log('✅ Robokassa payment verified successfully');
        return {
          success: true,
          orderId: params.InvId,
          amount: params.OutSum / 100, // Convert from kopecks
          signature: params.SignatureValue
        };
      } else {
        console.error('❌ Invalid Robokassa payment signature');
        return {
          success: false,
          error: 'Invalid signature'
        };
      }
    } catch (error) {
      console.error('❌ Error verifying Robokassa payment:', error);
      throw error;
    }
  },

  /**
   * Get payment status
   */
  async getPaymentStatus(orderId) {
    try {
      const endpoint = '/robokassa-payment-status';
      console.log('🔍 Getting Robokassa payment status for order:', orderId);
      
      const response = await fetch(`${SERVER_PAYMENTS_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Robokassa payment status retrieved:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error getting Robokassa payment status:', error);
      throw error;
    }
  },

  /**
   * Get Robokassa configuration
   */
  getConfig() {
    return {
      merchantLogin: ROBOKASSA_CONFIG.merchantLogin,
      mode: ROBOKASSA_CONFIG.mode,
      baseUrl: ROBOKASSA_CONFIG.baseUrl
    };
  }
};

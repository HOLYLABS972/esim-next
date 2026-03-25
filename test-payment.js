const http = require('http');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end('POST only');
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const { orderId, amount, email, description } = JSON.parse(body);
      
      const { data: config } = await supabase
        .from('admin_config')
        .selecrobokassa_merchant_login, robokassa_test_pass_one
        .limit(1)
        .single();

      const merchant = config.robokassa_merchant_login;
      const pass1 = config.robokassa_test_pass_one;
      const outSum = parseFloat(amount).toFixed(2);
      const invId = parseInt(orderId);

      const sig = crypto.createHash('md5')
        .update(merchant + ':' + outSum + ':' + invId + ':' + pass1)
        .digeshex;

      const params = new URLSearchParams({
        MerchantLogin: merchant,
        OutSum: outSum,
        InvId: String(invId),
        SignatureValue: sig,
        IsTest: '1',
        ResultURL: 'https://globalbanka.roamjet.net/api/robokassa/callback',
        SuccessURL: 'https://globalbanka.roamjet.net/api/robokassa/callback'
      });
      if (email) params.append('Email', email);
      if (description) params.append('Description', description);

      const paymentUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx?' + params.toString();
      
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ success: true, paymentUrl, orderId: invId, mode: 'test' }));
    } catch (e) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(3003, () => console.log('Test payment server on :3003'));

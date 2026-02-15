import { redirect } from 'next/navigation';
import { supabaseAdmin } from '../../../src/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export default async function PayRedirect({ params }) {
  const p = typeof params?.then === 'function' ? await params : params;
  const orderId = parseInt(p?.orderId, 10);

  if (!orderId || isNaN(orderId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>❌ Неверный номер заказа</p>
      </div>
    );
  }

  // Fetch order
  const { data: order } = await supabaseAdmin
    .from('esim_orders')
    .select('id, price_rub, status, country_name')
    .eq('id', orderId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>❌ Заказ не найден или уже оплачен</p>
      </div>
    );
  }

  // Fetch Robokassa config
  const { data: config } = await supabaseAdmin
    .from('admin_config')
    .select('robokassa_merchant_login, robokassa_pass_one, robokassa_mode')
    .limit(1)
    .single();

  const login = config.robokassa_merchant_login;
  const pass1 = config.robokassa_pass_one;
  const isTest = config.robokassa_mode === 'test';
  const amount = order.price_rub;
  const description = `eSIM ${order.country_name || ''} #${orderId}`;

  const sigStr = `${login}:${amount}:${orderId}:${pass1}`;
  const sig = crypto.createHash('md5').update(sigStr).digest('hex');

  const params2 = new URLSearchParams({
    MerchantLogin: login,
    OutSum: amount.toString(),
    InvId: orderId.toString(),
    Description: description,
    SignatureValue: sig,
    Culture: 'ru',
    Encoding: 'utf-8'
  });

  if (isTest) params2.append('IsTest', '1');

  const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${params2.toString()}`;

  // Server-side redirect — sets Referer header to globalbanka.roamjet.net
  redirect(paymentUrl);
}

import { supabaseAdmin } from './supabase';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const AIRALO_ID = '5f260affb036f58486895b58a0fbb803';
const AIRALO_SECRET = 'x8BesR7YdqZrRFAYRyQx5GFf6KGWs8wgEMTlpSr3';
const AIRALO_API = 'https://partners-api.airalo.com/v2';

async function getAiraloToken() {
  const res = await fetch(`${AIRALO_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: AIRALO_ID, client_secret: AIRALO_SECRET, grant_type: 'client_credentials' }),
  });
  const data = await res.json();
  return data?.data?.access_token;
}

async function orderAiralo(token, packageSlug) {
  const res = await fetch(`${AIRALO_API}/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ quantity: 1, package_id: packageSlug }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Airalo order failed: ${JSON.stringify(data)}`);
  return data;
}

async function getLatestSim(token) {
  const res = await fetch(`${AIRALO_API}/sims?limit=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const data = await res.json();
  return data?.data?.[0];
}

function buildEmailHtml(order, sim) {
  const plan = order.plan_name || order.metadata?.package_slug || 'eSIM';
  const country = order.country_name || '';
  const qrUrl = sim?.qrcode_url || '';
  const appleUrl = sim?.direct_apple_installation_url || '';

  let html = `<div style="font-family:system-ui;max-width:500px;margin:0 auto;background:#1a1a2e;color:#fff;padding:24px;border-radius:16px;">`;
  html += `<h2 style="text-align:center">✅ Ваш eSIM готов</h2>`;
  html += `<p style="text-align:center;color:#aaa">${country ? country + ' — ' : ''}${plan}</p>`;
  if (qrUrl) html += `<div style="text-align:center;margin:20px 0"><img src="${qrUrl}" width="200" height="200" style="border-radius:12px"/></div>`;
  if (appleUrl) html += `<div style="text-align:center;margin:16px 0"><a href="${appleUrl}" style="display:inline-block;padding:12px 24px;background:#4ade80;color:#000;border-radius:12px;font-weight:700;text-decoration:none">📲 Установить eSIM</a></div>`;
  html += `<p style="color:#f59e0b;text-align:center;font-size:13px;margin-top:12px">⏰ QR-код действителен 24 часа. Установите eSIM до истечения срока.</p>`;
  html += `<div style="text-align:center;margin:12px 0"><a href="https://globalbanka.roamjet.net/my-esims" style="color:#4ade80;font-size:14px;text-decoration:underline">📋 Мои eSIM</a></div>`;
  html += `<p style="color:#888;text-align:center;font-size:13px;margin-top:20px">Глобалбанка eSIM</p></div>`;
  return html;
}

async function sendEsimEmail(order, sim) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.privateemail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: { user: process.env.SMTP_USER || 'dima@holylabs.net', pass: process.env.SMTP_PASS || '1324Gpon@' },
  });

  const plan = order.plan_name || order.metadata?.package_slug || 'eSIM';
  const country = order.country_name || '';
  const subject = `Ваш eSIM готов — ${country ? country + ' ' : ''}${plan}`;
  const html = buildEmailHtml(order, sim);
  const to = [order.customer_email, 'dima@holylabs.net'].filter(Boolean).join(', ');

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Глобалбанка eSIM <dima@holylabs.net>',
    to,
    subject,
    html,
  });
  console.log(`📧 Email sent to: ${to}`);
}

export async function fulfillOrder(orderId) {
  console.log(`🚀 Starting fulfillment for order #${orderId}`);

  const { data: order } = await supabaseAdmin.from('esim_orders').select('*').eq('id', orderId).single();
  if (!order) { console.error(`❌ Order ${orderId} not found`); return; }
  if (order.status === 'active') { console.log(`✅ Order ${orderId} already fulfilled`); return; }

  const pkg = order.metadata?.package_slug;
  if (!pkg) { console.error(`❌ No package_slug for order ${orderId}`); return; }

  try {
    const token = await getAiraloToken();
    if (!token) throw new Error('No Airalo token');

    console.log(`📦 Ordering Airalo package: ${pkg}`);
    const airaloData = await orderAiralo(token, pkg);
    const sim = await getLatestSim(token);

    if (!sim) throw new Error('No SIM data returned');

    // Update order in DB
    await supabaseAdmin.from('esim_orders').update({
      airalo_order_id: String(airaloData?.data?.id || ''),
      iccid: sim.iccid || '',
      qr_code: sim.qrcode || '',
      qr_code_url: sim.qrcode_url || '',
      lpa: sim.lpa || '',
      matching_id: sim.matching_id || '',
      smdp_address: sim.lpa || '',
      direct_apple_installation_url: sim.direct_apple_installation_url || '',
      status: 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);

    console.log(`✅ eSIM fulfilled: ${sim.iccid} for order #${orderId}`);

    // Send email
    await sendEsimEmail(order, sim);

    return { success: true, iccid: sim.iccid };
  } catch (err) {
    console.error(`❌ Fulfillment failed for order #${orderId}:`, err.message);
    // Mark as failed but don't lose the order
    await supabaseAdmin.from('esim_orders').update({
      status: 'fulfillment_failed',
      metadata: { ...order.metadata, fulfillment_error: err.message },
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    return { success: false, error: err.message };
  }
}

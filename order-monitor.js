#!/usr/bin/env node
/**
 * Globalbanka Order Monitor
 * Checks for unfulfilled orders and sends daily summary via Telegram
 * Runs as cron job every 30 min
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:8000';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAIL = 'dima@holylabs.net';

if (!SUPABASE_KEY) {
  console.error('Missing env: SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: { user: 'dima@holylabs.net', pass: '1324Gpon@' }
});

async function sendEmail(subject, html) {
  await transporter.sendMail({
    from: 'Globalbanka Monitor <dima@holylabs.net>',
    to: ADMIN_EMAIL,
    subject,
    html
  });
}

async function checkOrders() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  // 1. Find orders that are "paid" but not fulfilled (no iccid) for > 5 min
  const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
  const { data: stuck } = await supabase
    .from('esim_orders')
    .select('id, customer_email, plan_name, country_name, status, price_rub, created_at')
    .eq('status', 'paid')
    .is('iccid', null)
    .lt('updated_at', fiveMinAgo)
    .order('created_at', { ascending: false });

  // 2. Find pending orders from real customers (not test) older than 30 min
  const thirtyMinAgo = new Date(now - 30 * 60 * 1000).toISOString();
  const { data: pending } = await supabase
    .from('esim_orders')
    .select('id, customer_email, plan_name, country_name, price_rub, created_at')
    .eq('status', 'pending')
    .lt('created_at', thirtyMinAgo)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false });

  const realPending = (pending || []).filter(o =>
    o.customer_email !== 'polskoydm@gmail.com' && o.customer_email !== 'test@test.com'
  );

  // 3. Today's summary
  const { data: todayOrders, error: todayError } = await supabase
    .from('esim_orders')
    .select('id, customer_email, status, price_rub, iccid')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false });

  if (todayError) console.error('todayOrders query error:', todayError);
  console.log(`Raw todayOrders: ${(todayOrders||[]).length}`);
  const allToday = (todayOrders || []).filter(o => 
    o.customer_email !== 'polskoydm@gmail.com' && o.customer_email !== 'test@test.com'
  );
  const fulfilled = allToday.filter(o => o.status === 'active' && o.iccid);
  console.log(`Filtered: ${allToday.length}, Fulfilled: ${fulfilled.length}`);
  const totalRevenue = fulfilled.reduce((sum, o) => sum + (o.price_rub || 0), 0);

  // Alert on stuck paid orders (URGENT)
  if (stuck && stuck.length > 0) {
    let html = '<h2>🚨 STUCK ORDERS (paid, not fulfilled)</h2>';
    for (const o of stuck) {
      html += `<p><b>#${o.id}</b> ${o.customer_email}<br>${o.country_name} ${o.plan_name} — ${o.price_rub}₽</p>`;
    }
    await sendEmail('🚨 Stuck Orders Alert — Globalbanka', html);
  }

  // Daily summary
  const mode = process.argv[2];
  if (mode === 'summary') {
    let html = `<h2>📊 Globalbanka — ${now.toISOString().slice(0, 10)}</h2>`;
    html += `<p>✅ <b>Fulfilled:</b> ${fulfilled.length}</p>`;
    html += `<p>💰 <b>Revenue:</b> ${totalRevenue}₽</p>`;

    if (fulfilled.length > 0) {
      html += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:10px 0"><tr style="background:#edf2f7"><th>Order</th><th>Email</th><th>Amount</th></tr>';
      for (const o of fulfilled) {
        html += `<tr><td>#${o.id}</td><td>${o.customer_email}</td><td>${o.price_rub}₽</td></tr>`;
      }
      html += '</table>';
    }

    if (realPending && realPending.length > 0) {
      html += `<p>⏳ <b>Abandoned (pending 30m+):</b> ${realPending.length}</p>`;
      for (const o of realPending) {
        html += `<p style="color:#888">#${o.id} ${o.customer_email} — ${o.price_rub}₽</p>`;
      }
    }

    const uniqueCustomers = new Set(fulfilled.map(o => o.customer_email));
    html += `<p>👥 <b>Unique customers:</b> ${uniqueCustomers.size}</p>`;

    await sendEmail(`📊 Globalbanka Daily — ${fulfilled.length} orders, ${totalRevenue}₽`, html);
  }

  // Log
  const stuckCount = stuck ? stuck.length : 0;
  console.log(`[${now.toISOString()}] Stuck: ${stuckCount}, Fulfilled today: ${fulfilled.length}, Revenue: ${totalRevenue}₽`);
}

checkOrders().catch(err => {
  console.error('Monitor error:', err.message);
  process.exit(1);
});

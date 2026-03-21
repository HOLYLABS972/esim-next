import nodemailer from 'nodemailer';

const AIRALO_BASE = 'https://partners-api.airalo.com/v2';
const ADMIN_EMAIL = 'dima@holylabs.net';

export async function getAiraloToken() {
  const res = await fetch(AIRALO_BASE + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AIRALO_CLIENT_ID,
      client_secret: process.env.AIRALO_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json();
  return data.data?.access_token;
}

export async function orderAiraloEsim(packageSlug) {
  const token = await getAiraloToken();
  if (!token) throw new Error('No Airalo token');
  const res = await fetch(AIRALO_BASE + '/orders', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ quantity: 1, package_id: packageSlug }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Airalo: ' + JSON.stringify(data));
  return data.data;
}

function buildAppleUrl(smdp, code) {
  if (!smdp) return '';
  return 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA:1$' + smdp + '$' + (code || '');
}

export async function sendEsimEmail(to, airaloOrder, planName, countryName) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const sim = airaloOrder?.sims?.[0] || {};
  const qrUrl = sim.qrcode_url || sim.qrcode || '';
  const smdp = sim.direct_apple_installation_url || sim.smdp_address || sim.lpa || '';
  const appleUrl = sim.direct_apple_installation_url || buildAppleUrl(smdp, sim.matching_id || sim.activation_code);
  const label = planName || airaloOrder?.package_name || 'eSIM';
  const country = countryName || '';

  let html = '<div style="font-family:system-ui;max-width:500px;margin:0 auto;background:#1a1a2e;color:#fff;padding:24px;border-radius:16px;">';
  html += '<h2 style="text-align:center">&#x2705; Ваш eSIM готов</h2>';
  if (country) {
    html += '<p style="text-align:center;font-size:18px;margin:8px 0">' + country + '</p>';
  }
  html += '<p style="text-align:center;color:#aaa">' + label + '</p>';
  if (qrUrl) {
    html += '<div style="text-align:center;margin:20px 0"><img src="' + qrUrl + '" width="200" height="200" style="border-radius:12px"/></div>';
  }
  if (appleUrl) {
    html += '<div style="text-align:center;margin:16px 0"><a href="' + appleUrl + '" style="display:inline-block;padding:12px 24px;background:#4ade80;color:#000;border-radius:12px;font-weight:700;text-decoration:none">&#x1F4F2; Установить eSIM</a></div>';
  }
  html += '<p style="color:#888;text-align:center;font-size:13px;margin-top:20px">Глобалбанка eSIM</p>';
  html += '<div style="text-align:center;margin:12px 0"><a href="https://globalbanka.roamjet.net/dashboard" style="color:#4ade80;font-size:14px;text-decoration:underline">&#x1F4CB; Личный кабинет</a></div></div>';

  const recipients = to === ADMIN_EMAIL ? to : to + ', ' + ADMIN_EMAIL;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Globalbanka eSIM <dima@holylabs.net>',
    to: recipients,
    subject: (country ? country + ' — ' : '') + 'Ваш eSIM готов — ' + label,
    html,
  });

  console.log('📧 Email sent to:', recipients);
}

const http = require('http');
const https = require('https');

const PORT = 3005;
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:8000';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

// ── Country names ──────────────────────────────────────────────
const COUNTRY_RU = {
  AE:'ОАЭ',AL:'Албания',AM:'Армения',AR:'Аргентина',AT:'Австрия',AU:'Австралия',
  AZ:'Азербайджан',BE:'Бельгия',BG:'Болгария',BR:'Бразилия',CA:'Канада',
  CH:'Швейцария',CN:'Китай',CO:'Колумбия',CY:'Кипр',CZ:'Чехия',DE:'Германия',
  DK:'Дания',EE:'Эстония',EG:'Египет',ES:'Испания',FI:'Финляндия',FR:'Франция',
  GB:'Великобритания',GE:'Грузия',GR:'Греция',HR:'Хорватия',HU:'Венгрия',
  ID:'Индонезия',IE:'Ирландия',IL:'Израиль',IN:'Индия',IT:'Италия',JP:'Япония',
  KG:'Кыргызстан',KH:'Камбоджа',KR:'Южная Корея',KZ:'Казахстан',LA:'Лаос',
  LK:'Шри-Ланка',LT:'Литва',LV:'Латвия',MA:'Марокко',ME:'Черногория',
  MV:'Мальдивы',MX:'Мексика',MY:'Малайзия',NL:'Нидерланды',NO:'Норвегия',
  NZ:'Новая Зеландия',PH:'Филиппины',PL:'Польша',PT:'Португалия',QA:'Катар',
  RO:'Румыния',RS:'Сербия',SA:'Саудовская Аравия',SE:'Швеция',SG:'Сингапур',
  TH:'Таиланд',TR:'Турция',TW:'Тайвань',UA:'Украина',US:'США',UZ:'Узбекистан',
  VN:'Вьетнам',ZA:'ЮАР',
};

function countryName(code) {
  return COUNTRY_RU[(code || '').toUpperCase()] || code || 'eSIM';
}

// ── Supabase REST helper ───────────────────────────────────────
async function supabaseQuery(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

// ── Detect event type ──────────────────────────────────────────
function detectEventType(payload) {
  const pct = payload.usage_percentage ?? payload.data_usage_percentage ?? payload.percent;
  const days = payload.days_remaining ?? payload.remaining_days;
  const alert = payload.alert_type ?? payload.type ?? payload.event;

  // Handle new Airalo format: { level: "75%", remaining_percentage: 24.02 }
  const level = payload.level;
  if (level === '75%' || level === '90%') {
    return level === '90%' ? 'data_90' : 'data_75';
  }

  if (alert === 'data_75' || pct === 75) return 'data_75';
  if (alert === 'data_90' || pct === 90) return 'data_90';
  if (alert === 'expiry_3days' || days === 3) return 'expiry_3days';
  if (alert === 'expiry_1day' || days === 1) return 'expiry_1day';

  if (typeof pct === 'number') {
    if (pct >= 90) return 'data_90';
    if (pct >= 75) return 'data_75';
  }
  if (typeof days === 'number') {
    if (days <= 1) return 'expiry_1day';
    if (days <= 3) return 'expiry_3days';
  }
  return null;
}

// ── Channel routing ────────────────────────────────────────────
// data → push, expiry → email
function getChannel(eventType) {
  return (eventType === 'data_75' || eventType === 'data_90') ? 'push' : 'email';
}

// ── Push via Expo ──────────────────────────────────────────────
async function sendPush(token, title, body, data) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default', data: data || {} }),
  });
  return res.json();
}

function getPushText(eventType, countryCode) {
  const c = countryName(countryCode);
  if (eventType === 'data_90') {
    return {
      title: `⚠️ Трафик почти исчерпан — ${c}`,
      body: `90% данных eSIM для ${c} использовано! Пополните прямо сейчас, чтобы остаться на связи.`,
    };
  }
  return {
    title: `📊 75% трафика использовано — ${c}`,
    body: `Вы израсходовали 75% данных eSIM для ${c}. Пополните сейчас, чтобы не остаться без интернета!`,
  };
}

// ── Email via internal relay ───────────────────────────────────
async function sendEmail(to, subject, html) {
  const res = await fetch('http://127.0.0.1:3002/api/internal/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${INTERNAL_API_SECRET}`,
    },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!res.ok) throw new Error(`Email relay: ${res.status}`);
  return res.json();
}

function getEmailContent(eventType, countryCode, planName) {
  const c = countryName(countryCode);
  const topUpUrl = 'https://globalbanka.roamjet.net/my-esims';
  const isLastDay = eventType === 'expiry_1day';

  const subject = isLastDay
    ? `⚠️ eSIM для ${c} истекает завтра!`
    : `📅 eSIM для ${c} истекает через 3 дня`;
  const heading = isLastDay
    ? `Последний день тарифа для ${c}!`
    : `Ваш тариф для ${c} скоро закончится`;
  const text = isLastDay
    ? `Ваш тариф ${planName} для ${c} заканчивается завтра. Пополните сейчас, чтобы остаться на связи!`
    : `Через 3 дня истечёт ваш тариф ${planName} для ${c}. Пополните заранее, чтобы не потерять связь!`;

  const html = `<div style="font-family:system-ui;max-width:500px;margin:0 auto;background:#1a1a2e;color:#fff;padding:24px;border-radius:16px;">
    <h2 style="text-align:center">${isLastDay ? '⚠️' : '📅'} ${heading}</h2>
    <p style="text-align:center;color:#ccc;font-size:15px;line-height:1.5">${text}</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${topUpUrl}" style="display:inline-block;padding:14px 32px;background:#4ade80;color:#000;border-radius:12px;font-weight:700;text-decoration:none;font-size:16px">🔄 Пополнить тариф</a>
    </div>
    <p style="color:#888;text-align:center;font-size:13px;margin-top:20px">Глобалбанка eSIM</p>
  </div>`;

  return { subject, html };
}

// ── HTTP Server ────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, service: 'airalo-webhook' }));
  }

  // Airalo webhook verification
  if (req.method === 'HEAD') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end('Method not allowed');
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      console.log(`[${new Date().toISOString()}] Webhook received:`, JSON.stringify(payload));

      const iccid = payload.iccid || payload.sim_iccid || payload.data?.iccid || '';
      if (!iccid) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, skipped: 'no_iccid' }));
      }

      const eventType = detectEventType(payload);
      if (!eventType) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, skipped: 'unknown_event' }));
      }

      // Find order by ICCID
      const orders = await supabaseQuery('esim_orders',
        `select=id,user_id,customer_email,country_code,country_name,plan_name&iccid=eq.${iccid}&limit=1`);
      const order = orders[0];

      if (!order) {
        console.warn('No order for ICCID:', iccid);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, skipped: 'no_order' }));
      }

      const channel = getChannel(eventType);
      const countryCode = order.country_code || '';
      let sent = false;
      let method = '';

      if (channel === 'push') {
        // Get user push token
        if (order.user_id) {
          const users = await supabaseQuery('users',
            `select=expo_push_token,push_notifications_enabled&id=eq.${order.user_id}&limit=1`);
          const user = users[0];

          if (user?.expo_push_token && user.push_notifications_enabled !== false) {
            const { title, body: pushBody } = getPushText(eventType, countryCode);
            const result = await sendPush(user.expo_push_token, title, pushBody, {
              type: eventType, orderId: String(order.id), iccid, countryCode,
            });
            console.log(`📱 Push sent (${eventType}) for ${iccid}:`, result?.data?.status);
            sent = true;
            method = 'push';
          }
        }
        if (!sent && order.customer_email) {
          // Fallback: send email when no push token
          const c = countryName(countryCode);
          const pctLabel = eventType === 'data_90' ? '90%' : '75%';
          const subject = eventType === 'data_90'
            ? `\u26a0\ufe0f ${pctLabel} \u0442\u0440\u0430\u0444\u0438\u043a\u0430 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u043e \u2014 ${c}`
            : `\ud83d\udcca ${pctLabel} \u0442\u0440\u0430\u0444\u0438\u043a\u0430 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u043e \u2014 ${c}`;
          const topUpUrl = 'https://globalbanka.roamjet.net/my-esims';
          const html = `<div style="font-family:system-ui;max-width:500px;margin:0 auto;background:#1a1a2e;color:#fff;padding:24px;border-radius:16px;"><h2 style="text-align:center">${eventType === 'data_90' ? '\u26a0\ufe0f' : '\ud83d\udcca'} ${pctLabel} \u0442\u0440\u0430\u0444\u0438\u043a\u0430 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u043e</h2><p style="text-align:center;color:#ccc;font-size:15px;line-height:1.5">\u0412\u044b \u0438\u0437\u0440\u0430\u0441\u0445\u043e\u0434\u043e\u0432\u0430\u043b\u0438 ${pctLabel} \u0434\u0430\u043d\u043d\u044b\u0445 eSIM \u0434\u043b\u044f ${c}. \u041f\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0441\u0435\u0439\u0447\u0430\u0441!</p><div style="text-align:center;margin:24px 0"><a href="${topUpUrl}" style="display:inline-block;padding:14px 32px;background:#4ade80;color:#000;border-radius:12px;font-weight:700;text-decoration:none;font-size:16px">\ud83d\udd04 \u041f\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0442\u0430\u0440\u0438\u0444</a></div><p style="color:#888;text-align:center;font-size:13px;margin-top:20px">\u0413\u043b\u043e\u0431\u0430\u043b\u0431\u0430\u043d\u043a\u0430 eSIM</p></div>`;
          await sendEmail(order.customer_email, subject, html);
          console.log(`\ud83d\udce7 Email fallback (${eventType}) to ${order.customer_email} for ${iccid}`);
          sent = true; method = 'email_fallback';
        }
        if (!sent) console.log(`\ud83d\udcf1 No push token or email for ${iccid} \u2014 data alert skipped`);
      } else {
        // Email for expiry
        const email = order.customer_email;
        if (email) {
          const planName = order.plan_name || 'eSIM';
          const { subject, html } = getEmailContent(eventType, countryCode, planName);
          await sendEmail(email, subject, html);
          console.log(`📧 Email sent (${eventType}) to ${email} for ${iccid}`);
          sent = true;
          method = 'email';
        } else {
          console.warn(`📧 No email for order ${order.id}`);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, eventType, channel, sent, method }));
    } catch (err) {
      console.error('Webhook error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🔔 Airalo webhook server running on port ${PORT}`);
});

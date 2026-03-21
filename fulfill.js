// Standalone fulfillment script - called after payment
// Usage: node fulfill.js <orderId>
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://supabase.holylabs.net";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_JWT || process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(SUPABASE_URL, SUPABASE_KEY, {auth:{persistSession:false}});

const AIRALO_ID = "5f260affb036f58486895b58a0fbb803";
const AIRALO_SECRET = "x8BesR7YdqZrRFAYRyQx5GFf6KGWs8wgEMTlpSr3";

async function fulfill(orderId) {
  const {data: order} = await db.from("esim_orders").selec*.eq("id", orderId).single();
  if (!order) return console.error("Order not found:", orderId);
  if (order.status === "active") return console.log("Already fulfilled:", orderId);
  
  const pkg = order.metadata?.package_slug;
  if (!pkg) return console.error("No package_slug for order:", orderId);
  
  console.log("Ordering Airalo:", pkg, "for order", orderId);
  
  // Get token
  const tRes = await fetch("https://partners-api.airalo.com/v2/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({client_id:AIRALO_ID, client_secret:AIRALO_SECRET, grant_type:"client_credentials"})
  });
  const tok = (await tRes.json()).data?.access_token;
  if (!tok) return console.error("No Airalo token");

  // Order eSIM
  const oRes = await fetch("https://partners-api.airalo.com/v2/orders", {
    method: "POST",
    headers: {Authorization:"Bearer "+tok, "Content-Type":"application/json", Accept:"application/json"},
    body: JSON.stringify({quantity:1, package_id:pkg})
  });
  const oData = await oRes.json();
  if (!oRes.ok) return console.error("Airalo order failed:", JSON.stringify(oData));

  // Get SIM details
  const sRes = await fetch("https://partners-api.airalo.com/v2/sims?limit=1", {
    headers: {Authorization:"Bearer "+tok, Accept:"application/json"}
  });
  const sim = (await sRes.json()).data?.[0];
  if (!sim) return console.error("No SIM data");

  // Update DB
  await db.from("esim_orders").update({
    airalo_order_id: String(oData.data.id),
    iccid: sim.iccid || "",
    qr_code: sim.qrcode || "",
    qr_code_url: sim.qrcode_url || "",
    lpa: sim.lpa || "",
    matching_id: sim.matching_id || "",
    smdp_address: sim.lpa || "",
    direct_apple_installation_url: sim.direct_apple_installation_url || "",
    status: "active",
    updated_at: new Date().toISOString()
  }).eq("id", orderId);

  console.log("eSIM fulfilled:", sim.iccid, "for order", orderId);
  
  // Send email
  const nodemailer = require("nodemailer");
  const t = nodemailer.createTransport({host:"mail.privateemail.com",port:465,secure:true,auth:{user:"dima@holylabs.net",pass:"1324Gpon@"}});
  const appleUrl = sim.direct_apple_installation_url || "";
  const qrUrl = sim.qrcode_url || "";
  const plan = order.plan_name || pkg;
  let html = "<div style=\"font-family:system-ui;max-width:500px;margin:0 auto;background:#1a1a2e;color:#fff;padding:24px;border-radius:16px;\">";
  html += "<h2 style=\"text-align:center\">✅ Ваш eSIM готов</h2>";
  html += "<p style=\"text-align:center;color:#aaa\">" + plan + "</p>";
  if (qrUrl) html += "<div style=\"text-align:center;margin:20px 0\"><img src=\"" + qrUrl + "\" width=\"200\" height=\"200\" style=\"border-radius:12px\"/></div>";
  if (appleUrl) html += "<div style=\"text-align:center;margin:16px 0\"><a href=\"" + appleUrl + "\" style=\"display:inline-block;padding:12px 24px;background:#4ade80;color:#000;border-radius:12px;font-weight:700;text-decoration:none\">📲 Установить eSIM</a></div>";
  html += "<div style=\"text-align:center;margin:12px 0\"><a href=\"https://globalbanka.roamjet.net/dashboard\" style=\"color:#4ade80;font-size:14px;text-decoration:underline\">📋 Личный кабинет</a></div>";
  html += "<p style=\"color:#888;text-align:center;font-size:13px;margin-top:20px\">Глобалбанка eSIM</p></div>";
  
  await t.sendMail({
    from: "Глобалбанка eSIM <dima@holylabs.net>",
    to: order.customer_email + ", dima@holylabs.net",
    subject: "Ваш eSIM готов — " + plan,
    html
  });
  console.log("Email sent to:", order.customer_email);
}

fulfill(parseInt(process.argv[2])).catch(e => console.error("Fatal:", e.message));

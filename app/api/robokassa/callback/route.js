import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

// Load Robokassa config from Supabase
async function getRobokassaConfig() {
  if (!supabaseAdmin) throw new Error('Supabase not configured');

  const { data: config, error } = await supabaseAdmin
    .from('admin_config')
    .select('robokassa_merchant_login, robokassa_pass_one, robokassa_pass_two, robokassa_mode')
    .limit(1)
    .single();

  if (error || !config) throw new Error('Robokassa credentials not configured');

  return {
    merchantLogin: config.robokassa_merchant_login || '',
    passOne: config.robokassa_pass_one || '',
    passTwo: config.robokassa_pass_two || '',
    mode: config.robokassa_mode || 'test'
  };
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Verify Robokassa signature
 * ResultURL (POST): OutSum:InvId:Password2
 * SuccessURL (GET): OutSum:InvId:Password1
 */
async function verifySignature(params, usePassOne = false) {
  const { OutSum, InvId, SignatureValue } = params;
  if (!OutSum || !InvId || !SignatureValue) return false;

  const config = await getRobokassaConfig();
  const password = usePassOne ? config.passOne : config.passTwo;

  const sig1 = md5(`${OutSum}:${InvId}:${password}`).toLowerCase();
  const received = String(SignatureValue).toLowerCase();

  if (sig1 === received) return true;

  // SuccessURL alternate format: MerchantLogin:OutSum:InvId:Password1
  if (usePassOne) {
    const sig2 = md5(`${config.merchantLogin}:${OutSum}:${InvId}:${password}`).toLowerCase();
    return sig2 === received;
  }

  return false;
}

/**
 * Find order by InvId — try airalo_order_id first, then DB id
 */
async function findOrder(invId) {
  const idStr = invId.toString();

  // Try by airalo_order_id
  let { data: order } = await supabaseAdmin
    .from('esim_orders')
    .select('*')
    .eq('airalo_order_id', idStr)
    .limit(1)
    .maybeSingle();

  if (order) return order;

  // Try by DB id (bot uses DB id as Robokassa InvId)
  const idNum = parseInt(idStr, 10);
  if (!isNaN(idNum) && idNum > 0 && idNum < 10000000) {
    const { data: orderById } = await supabaseAdmin
      .from('esim_orders')
      .select('*')
      .eq('id', idNum)
      .limit(1)
      .maybeSingle();

    if (orderById) return orderById;
  }

  return null;
}

/**
 * POST handler — ResultURL (server-to-server callback from Robokassa)
 * Marks order as paid. Actual eSIM fulfillment is handled by email processor.
 */
export async function POST(request) {
  try {
    // Parse form data or JSON
    let body = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params) body[key] = value;
    } else if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Try URL search params (Robokassa sometimes sends as query)
      const url = new URL(request.url);
      for (const [key, value] of url.searchParams) body[key] = value;
    }

    const { OutSum, InvId, SignatureValue } = body;
    console.log(`💳 Robokassa ResultURL callback: InvId=${InvId}, OutSum=${OutSum}`);

    if (!OutSum || !InvId || !SignatureValue) {
      console.error('❌ Missing required params:', { OutSum, InvId, SignatureValue: !!SignatureValue });
      return new NextResponse('bad request', { status: 400 });
    }

    // Verify signature with Password2
    const isValid = await verifySignature(body, false);
    if (!isValid) {
      console.error('❌ Invalid signature for InvId:', InvId);
      return new NextResponse('bad sign', { status: 400 });
    }

    console.log(`✅ Signature verified for InvId: ${InvId}`);

    // Find and update order
    const order = await findOrder(InvId);
    if (order) {
      console.log(`✅ Order found: id=${order.id}, status=${order.status}`);

      if (order.status !== 'active') {
        await supabaseAdmin
          .from('esim_orders')
          .update({
            status: 'paid',
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        console.log(`✅ Order ${order.id} marked as paid`);
      }
    } else {
      console.warn(`⚠️ Order not found for InvId: ${InvId}`);
    }

    // Robokassa expects OK{InvId} response
    return new NextResponse(`OK${InvId}`, { status: 200 });

  } catch (error) {
    console.error('❌ Robokassa callback error:', error.message);
    return new NextResponse('error', { status: 500 });
  }
}

/**
 * GET handler — SuccessURL (user redirect after payment)
 * Redirects user to success page.
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const { OutSum, InvId, SignatureValue } = params;

    console.log(`💳 Robokassa SuccessURL redirect: InvId=${InvId}`);

    if (OutSum && InvId && SignatureValue) {
      // Verify with Password1
      const isValid = await verifySignature(params, true);

      if (isValid) {
        // Find and update order
        const order = await findOrder(InvId);
        if (order && order.status !== 'active') {
          await supabaseAdmin
            .from('esim_orders')
            .update({
              status: 'paid',
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);
        }
      }
    }

    // Redirect to success page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
    return NextResponse.redirect(`${baseUrl}/payment-success/esim?order=${InvId || ''}`);

  } catch (error) {
    console.error('❌ Robokassa success redirect error:', error.message);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://globalbanka.roamjet.net';
    return NextResponse.redirect(`${baseUrl}/payment-success/esim`);
  }
}

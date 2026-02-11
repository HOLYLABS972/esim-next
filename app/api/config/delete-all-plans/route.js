import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/config/delete-all-plans
 * Deletes all rows from esim_packages using direct PostgREST DELETE.
 * Includes full debug logging to diagnose deletion issues.
 */
export async function POST() {
  const debug = {};

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    debug.hasUrl = !!supabaseUrl;
    debug.hasKey = !!serviceKey;
    debug.keyPrefix = serviceKey ? serviceKey.slice(0, 10) + '...' : 'MISSING';

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase not configured (missing URL or service role key)');
    }

    const baseUrl = `${supabaseUrl}/rest/v1`;
    const authHeaders = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    };

    // STEP 0: Count rows BEFORE delete
    const beforeRes = await fetch(`${baseUrl}/esim_packages?select=id`, {
      method: 'HEAD',
      headers: { ...authHeaders, 'Prefer': 'count=exact' },
    });
    debug.beforeStatus = beforeRes.status;
    debug.beforeRange = beforeRes.headers.get('content-range');
    debug.beforeCount = debug.beforeRange?.split('/')?.[1] || '?';
    console.log('[DELETE-ALL] Before count:', debug.beforeRange);

    // STEP 1: Unlink orders so FK doesn't block delete
    const unlinkRes = await fetch(`${baseUrl}/esim_orders?package_id=not.is.null`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ package_id: null }),
    });
    debug.unlinkStatus = unlinkRes.status;
    debug.unlinkOk = unlinkRes.ok;
    if (!unlinkRes.ok) {
      debug.unlinkBody = await unlinkRes.text();
    }
    console.log('[DELETE-ALL] Unlink orders:', debug.unlinkStatus);

    // STEP 2: Delete ALL rows — use different filter approaches
    // Try with id=not.is.null (matches all non-null ids = every row)
    const deleteRes = await fetch(`${baseUrl}/esim_packages?id=not.is.null`, {
      method: 'DELETE',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        'Prefer': 'return=headers-only,count=exact',
      },
    });

    debug.deleteStatus = deleteRes.status;
    debug.deleteOk = deleteRes.ok;
    debug.deleteRange = deleteRes.headers.get('content-range');
    debug.deleteHeaders = Object.fromEntries(deleteRes.headers.entries());

    // Read body if there is one
    const deleteBodyText = await deleteRes.text();
    debug.deleteBody = deleteBodyText.slice(0, 500);

    console.log('[DELETE-ALL] Delete result:', {
      status: debug.deleteStatus,
      ok: debug.deleteOk,
      range: debug.deleteRange,
      body: debug.deleteBody,
    });

    if (!deleteRes.ok) {
      throw new Error(`PostgREST DELETE failed (${debug.deleteStatus}): ${debug.deleteBody}`);
    }

    // STEP 3: Count rows AFTER delete to verify
    const afterRes = await fetch(`${baseUrl}/esim_packages?select=id`, {
      method: 'HEAD',
      headers: { ...authHeaders, 'Prefer': 'count=exact' },
    });
    debug.afterStatus = afterRes.status;
    debug.afterRange = afterRes.headers.get('content-range');
    debug.afterCount = debug.afterRange?.split('/')?.[1] || '?';
    console.log('[DELETE-ALL] After count:', debug.afterRange);

    const deleted = debug.deleteRange?.split('/')?.[1] || debug.beforeCount;

    return NextResponse.json({
      success: true,
      message: `Deleted plans from esim_packages`,
      deleted,
      debug,
    });
  } catch (error) {
    console.error('[DELETE-ALL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete plans',
        debug,
      },
      { status: 500 }
    );
  }
}

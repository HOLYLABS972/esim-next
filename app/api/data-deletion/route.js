import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/data-deletion
 * Store a data deletion request (GDPR/privacy). Body: { email, reason? }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email ?? '').toString().trim().toLowerCase();
    const reason = (body.reason ?? '').toString().trim() || null;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : null;
    const userAgent = request.headers.get('user-agent') || null;

    const { data, error } = await supabaseAdmin
      .from('data_deletion_requests')
      .insert({
        email,
        reason,
        status: 'pending',
        ip_address: ip || null,
        user_agent: userAgent || null,
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Data deletion request insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your data deletion request has been received.',
      id: data?.id,
    });
  } catch (err) {
    console.error('Data deletion API error:', err);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

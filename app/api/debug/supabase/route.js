import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'NOT SET';
  return NextResponse.json({
    supabase_url: url,
    has_service_key: !!(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}

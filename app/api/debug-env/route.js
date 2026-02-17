import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supaVars = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (key.includes('SUPA') || key.includes('supa')) {
      supaVars[key] = val ? val.substring(0, 60) : '(empty)';
    }
  }
  return NextResponse.json(supaVars);
}

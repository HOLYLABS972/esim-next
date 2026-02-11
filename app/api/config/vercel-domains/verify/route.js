import { NextResponse } from 'next/server';

const VERCEL_API = 'https://api.vercel.com';

function getVercelToken() {
  return process.env.VERCEL_TOKEN?.trim() || '';
}

function getProjectId() {
  return process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim() || '';
}

/**
 * POST - Verify a domain on the Vercel project
 * Body: { domain: "example.com" }
 */
export async function POST(request) {
  try {
    const token = getVercelToken();
    const projectId = getProjectId();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'VERCEL_TOKEN is not set.' },
        { status: 503 }
      );
    }
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME is not set.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const domain = (body.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain is required.' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error?.message || data.error || `Vercel API error: ${res.status}` },
        { status: res.status === 401 ? 401 : res.status >= 500 ? 502 : 400 }
      );
    }

    return NextResponse.json({ success: true, verification: data });
  } catch (error) {
    console.error('Vercel domain verify error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify domain' },
      { status: 500 }
    );
  }
}

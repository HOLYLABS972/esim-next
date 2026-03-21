import { NextResponse } from 'next/server';

const VERCEL_API = 'https://api.vercel.com';

function getVercelToken() {
  return process.env.VERCEL_TOKEN?.trim() || '';
}

function getProjectId() {
  return process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim() || '';
}

/**
 * GET - List domains for the Vercel project
 */
export async function GET() {
  try {
    const token = getVercelToken();
    const projectId = getProjectId();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'VERCEL_TOKEN is not set. Add it in Vercel project settings or .env.' },
        { status: 503 }
      );
    }
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME is not set.' },
        { status: 503 }
      );
    }

    const res = await fetch(`${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/domains`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { success: false, error: err || `Vercel API error: ${res.status}` },
        { status: res.status === 401 ? 401 : res.status >= 500 ? 502 : 400 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, domains: data.domains || [] });
  } catch (error) {
    console.error('Vercel domains list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list domains' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add a domain to the Vercel project
 * Body: { name: "example.com" }
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
    const name = (body.name || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Domain name is required (e.g. example.com or sub.example.com).' },
        { status: 400 }
      );
    }

    const res = await fetch(`${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error?.message || data.error || `Vercel API error: ${res.status}` },
        { status: res.status === 401 ? 401 : res.status >= 500 ? 502 : 400 }
      );
    }

    return NextResponse.json({ success: true, domain: data });
  } catch (error) {
    console.error('Vercel domain add error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add domain' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a domain from the Vercel project
 * Query: ?domain=example.com
 */
export async function DELETE(request) {
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

    const url = request.nextUrl || new URL(request.url);
    const domain = (url.searchParams.get('domain') || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "domain" is required.' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.error?.message || err.error || `Vercel API error: ${res.status}` },
        { status: res.status === 401 ? 401 : res.status >= 500 ? 502 : 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vercel domain remove error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove domain' },
      { status: 500 }
    );
  }
}

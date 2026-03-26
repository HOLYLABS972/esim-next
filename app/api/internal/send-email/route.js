import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.privateemail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'dima@holylabs.net',
    pass: process.env.SMTP_PASS || '1324Gpon@',
  },
});

export async function POST(request) {
  try {
    // Verify internal secret
    const auth = request.headers.get('authorization') || '';
    const token = auth.replace('Bearer ', '');

    if (!INTERNAL_SECRET || token !== INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing to, subject, or html' }, { status: 400 });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Глобалбанка eSIM <dima@holylabs.net>',
      to,
      subject,
      html,
    });

    console.log(`📧 Internal email sent to: ${to} — ${subject}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('📧 Internal email error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

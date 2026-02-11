import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../lib/supabase';

// Create reusable transporter object
const createTransporter = async () => {
  let smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.SMTP_FROM
  };

  try {
    // Get SMTP config from Supabase
    const { data: dbConfig, error } = await supabaseAdmin
      .from('admin_config')
      .select('smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from')
      .single();

    if (!error && dbConfig && (dbConfig.smtp_host || dbConfig.smtpHost)) {
      console.log('📧 Using SMTP settings from Supabase');
      smtpConfig = {
        host: dbConfig.smtp_host || dbConfig.smtpHost,
        port: dbConfig.smtp_port || dbConfig.smtpPort || 587,
        secure: dbConfig.smtp_secure ?? dbConfig.smtpSecure,
        auth: {
          user: dbConfig.smtp_user || dbConfig.smtpUser,
          pass: dbConfig.smtp_pass || dbConfig.smtpPass,
        },
        from: dbConfig.smtp_from || dbConfig.smtpFrom
      };
    } else {
      console.log('📧 Using SMTP settings from environment variables');
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch SMTP config from DB, using env vars:', error.message);
  }

  // Check if SMTP settings are available
  if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.warn('⚠️ SMTP settings not found (DB or Env). Email sending will be disabled.');
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
      connectionTimeout: 10000, // 10 seconds connection timeout
      greetingTimeout: 10000, // 10 seconds greeting timeout
      socketTimeout: 10000, // 10 seconds socket timeout
    }),
    from: smtpConfig.from || '"Global Banka" <noreply@globalbankaccounts.ru>'
  };
};

/**
 * Send email via SMTP2GO REST API (preferred method - faster and more reliable)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.from - Sender email
 * @returns {Promise<boolean>} - True if sent, false otherwise
 */
const sendEmailViaSMTP2GO = async ({ to, subject, html, from }, timeoutMs = 10000) => {
  try {
    // Get SMTP2GO API key from environment or database
    // Check NEXT_SMTP first (user's preferred name), then SMTP2GO_API_KEY
    let apiKey = process.env.NEXT_SMTP || process.env.SMTP2GO_API_KEY;
    
    if (!apiKey) {
      try {
        // Get SMTP2GO API key from Supabase
        const { data: dbConfig, error } = await supabaseAdmin
          .from('admin_config')
          .select('smtp2go_api_key, next_smtp')
          .single();
        
        if (!error && dbConfig) {
          // Check both possible field names
          apiKey = dbConfig.smtp2go_api_key || dbConfig.smtp2goApiKey || dbConfig.next_smtp || dbConfig.nextSmtp;
          if (apiKey) {
            console.log('📧 Using SMTP2GO API key from database');
          }
        }
      } catch (error) {
        console.error('⚠️ Error fetching SMTP2GO API key from database:', error.message);
      }
    } else {
      console.log('📧 Using SMTP2GO API key from environment variable');
    }

    if (!apiKey) {
      console.error('❌ SMTP2GO API key not found!');
      console.error('   Please set NEXT_SMTP environment variable or add smtp2goApiKey/nextSmtp to database config');
      return null;
    }

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`SMTP2GO API timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Send via SMTP2GO REST API
    const response = await Promise.race([
      fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Smtp2go-Api-Key': apiKey,
        },
        body: JSON.stringify({
          api_key: apiKey,
          to: [to],
          sender: from,
          subject: subject,
          html_body: html,
        }),
      }),
      timeoutPromise
    ]);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ SMTP2GO API error:', response.status, errorData);
      return false;
    }

    const result = await response.json();
    if (result.data && result.data.error) {
      console.error('❌ SMTP2GO API error:', result.data.error);
      return false;
    }

    console.log('✅ Email sent via SMTP2GO:', result.data?.email_id || 'success');
    return true;
  } catch (error) {
    if (error.message && error.message.includes('timeout')) {
      console.error(`⏱️ SMTP2GO API timeout for ${to} after ${timeoutMs}ms`);
    } else {
      console.error('❌ SMTP2GO API error:', error.message);
    }
    return false;
  }
};

/**
 * Send an email via SMTP2GO REST API only (no fallback)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000 = 10 seconds)
 * @returns {Promise<boolean>} - True if sent, false otherwise
 */
export const sendEmail = async ({ to, subject, html }, timeoutMs = 10000) => {
  try {
    // Get sender email from config
    let from = '"Global Banka" <noreply@globalbankaccounts.ru>';
    
    try {
      await connectDB();
      const dbConfig = await AdminConfig.findOne();
      if (dbConfig && dbConfig.smtpFrom) {
        from = dbConfig.smtpFrom;
      } else if (process.env.SMTP_FROM) {
        from = process.env.SMTP_FROM;
      }
    } catch (error) {
      // Use default from
    }

    // Send via SMTP2GO REST API only
    const result = await sendEmailViaSMTP2GO({
      to,
      subject,
      html,
      from
    }, timeoutMs);

    if (result === true) {
      return true; // Successfully sent via SMTP2GO
    }

    // If result is null, API key not found
    if (result === null) {
      console.error('❌ SMTP2GO API key not found. Please set NEXT_SMTP environment variable or add smtp2goApiKey to database config.');
      return false;
    }

    // If result is false, sending failed
    return false;
  } catch (error) {
    console.error('❌ Error sending email via SMTP2GO:', error);
    return false;
  }
};

/**
 * Send activation email for eSIM
 * @param {string} email - Customer email
 * @param {string} orderId - Order ID
 * @param {string} planName - Plan name
 * @param {string} activationLink - Activation link
 */
export const sendActivationEmail = async (email, orderId, planName, activationLink) => {
  const subject = `Ваш заказ #${orderId} успешно оплачен!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #333;">Спасибо за оплату!</h2>
      <p>Ваш заказ <strong>#${orderId}</strong> на тариф <strong>${planName}</strong> успешно оплачен.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold;">Детали заказа:</p>
        <p style="margin: 5px 0;">Номер заказа: ${orderId}</p>
        <p style="margin: 5px 0;">Тариф: ${planName}</p>
      </div>

      <p>Для активации и просмотра деталей вашего заказа, пожалуйста, перейдите по ссылке ниже:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${activationLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Активировать eSIM
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">Если кнопка не работает, скопируйте и вставьте следующую ссылку в браузер:</p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">${activationLink}</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #888; font-size: 12px; text-align: center;">
        С уважением,<br>
        Команда Global Banka
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

/**
 * Send verification link email (for signup)
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @param {string} verificationUrl - Verification URL
 */
export const sendVerificationLinkEmail = async (email, displayName, verificationUrl) => {
  const subject = 'Подтвердите ваш email для завершения регистрации';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #333;">Добро пожаловать, ${displayName}!</h2>
      <p>Спасибо за регистрацию в Global Banka. Для завершения регистрации, пожалуйста, подтвердите ваш email адрес, нажав на кнопку ниже:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Подтвердить Email
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">Если кнопка не работает, скопируйте и вставьте следующую ссылку в браузер:</p>
      <p style="color: #666; font-size: 12px; word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
      
      <p style="color: #888; font-size: 12px; margin-top: 20px;">Эта ссылка действительна в течение 24 часов.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #888; font-size: 12px; text-align: center;">
        С уважением,<br>
        Команда Global Banka
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

/**
 * Send login link email (direct login link instead of magic link)
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @param {string} loginLink - Direct login link (e.g., /login?email=...)
 */
export const sendLoginLinkEmail = async (email, displayName, loginLink) => {
  const subject = 'Ваша ссылка для входа';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #333;">Здравствуйте, ${displayName || email.split('@')[0]}!</h2>
      <p>Нажмите на кнопку ниже, чтобы войти в ваш аккаунт:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Войти в аккаунт
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">Если кнопка не работает, скопируйте и вставьте следующую ссылку в браузер:</p>
      <p style="color: #666; font-size: 12px; word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${loginLink}</p>
      
      <p style="color: #888; font-size: 12px; margin-top: 20px;">Если вы не запрашивали вход, просто проигнорируйте это письмо.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #888; font-size: 12px; text-align: center;">
        С уважением,<br>
        Команда Global Banka
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

/**
 * Send password reset email with link
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @param {string} resetLink - Password reset link
 */
export const sendPasswordResetEmail = async (email, displayName, resetLink) => {
  const subject = 'Сброс пароля';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #333;">Здравствуйте, ${displayName}</h2>
      <p>Вы запросили сброс пароля для вашего аккаунта. Нажмите на кнопку ниже, чтобы установить новый пароль:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Сбросить пароль
        </a>
    </div>
      
      <p style="color: #666; font-size: 14px;">Если кнопка не работает, скопируйте и вставьте следующую ссылку в браузер:</p>
      <p style="color: #666; font-size: 12px; word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${resetLink}</p>
      
      <p style="color: #888; font-size: 12px; margin-top: 20px;">Эта ссылка действительна в течение 1 часа.</p>
      <p style="color: #888; font-size: 12px;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #888; font-size: 12px; text-align: center;">
        С уважением,<br>
        Команда Global Banka
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

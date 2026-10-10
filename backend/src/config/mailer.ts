import nodemailer from 'nodemailer';
import { env } from './env';

let transporter: nodemailer.Transporter | null = null;

if (env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  console.log(`[Mailer] Connected to SMTP server at ${env.SMTP_HOST}:${env.SMTP_PORT}`);
} else {
  console.log('[Mailer] SMTP credentials not configured — running in Console Mode (no account needed, emails print directly to terminal).');
}

export interface MailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendMail(options: MailOptions) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.MAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return;
    } catch (err) {
      console.error('[SMTP Error] Failed to send email via SMTP, falling back to console:', err);
    }
  }

  // Zero-config Console Mode (Default)
  const separator = '═'.repeat(60);
  console.log(`\n${separator}`);
  console.log(`📬 [MOCK EMAIL DISPATCHED]`);
  console.log(`To:      ${options.to}`);
  console.log(`From:    ${env.MAIL_FROM}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`─`.repeat(60));
  console.log(options.text || options.html?.replace(/<[^>]*>?/gm, '').trim());
  console.log(`${separator}\n`);
}

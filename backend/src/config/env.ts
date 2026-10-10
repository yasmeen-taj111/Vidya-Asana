import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'vidya_asana',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'vidya_asana_access_secret_key_32chars_long_1234',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'vidya_asana_refresh_secret_key_32chars_long_1234',
  QR_SECRET: process.env.QR_SECRET || 'vidya_asana_qr_hmac_secret_key_32chars_long_1234',

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '2525', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || '"Vidya Asana" <noreply@vidyaasana.test>',

  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};

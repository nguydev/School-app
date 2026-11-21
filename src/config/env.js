const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1, 'MONGODB_URI is required')
    .refine(
      (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      'MONGODB_URI must be a MongoDB connection string',
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default(''),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  OTP_PEPPER: z.string().min(32, 'OTP_PEPPER must be at least 32 characters'),
  SMTP_HOST: z.string().trim().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  EMAIL_FROM: z.string().trim().default(''),
  LOG_OTP_TO_CONSOLE: z.enum(['true', 'false']).default('false'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().default(''),
  CLOUDINARY_API_KEY: z.string().trim().default(''),
  CLOUDINARY_API_SECRET: z.string().trim().default(''),
  CLOUDINARY_FOLDER: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9/_-]*$/)
    .default('yesin-app'),
}).superRefine((config, context) => {
  if (config.JWT_ACCESS_SECRET === config.OTP_PEPPER) {
    context.addIssue({
      code: 'custom',
      path: ['OTP_PEPPER'],
      message: 'JWT_ACCESS_SECRET and OTP_PEPPER must be different values',
    });
  }

  const smtpTransportConfigured = Boolean(config.SMTP_HOST && config.EMAIL_FROM);
  const smtpPartiallyConfigured =
    Boolean(config.SMTP_HOST || config.SMTP_USER || config.SMTP_PASSWORD || config.EMAIL_FROM) &&
    !smtpTransportConfigured;

  if (smtpPartiallyConfigured) {
    context.addIssue({
      code: 'custom',
      path: ['SMTP_HOST'],
      message: 'Configure SMTP_HOST and EMAIL_FROM together',
    });
  }

  if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD)) {
    context.addIssue({
      code: 'custom',
      path: ['SMTP_USER'],
      message: 'Configure SMTP_USER and SMTP_PASSWORD together',
    });
  }

  if (config.EMAIL_FROM && !z.email().safeParse(config.EMAIL_FROM).success) {
    context.addIssue({
      code: 'custom',
      path: ['EMAIL_FROM'],
      message: 'EMAIL_FROM must be a valid email address',
    });
  }

  if (
    config.NODE_ENV === 'production' &&
    !(config.SMTP_HOST && config.EMAIL_FROM && config.SMTP_USER && config.SMTP_PASSWORD)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['SMTP_HOST'],
      message: 'SMTP settings are required in production',
    });
  }

  const cloudinaryValues = [
    config.CLOUDINARY_CLOUD_NAME,
    config.CLOUDINARY_API_KEY,
    config.CLOUDINARY_API_SECRET,
  ];
  if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean)) {
    context.addIssue({
      code: 'custom',
      path: ['CLOUDINARY_CLOUD_NAME'],
      message: 'Configure all three Cloudinary credentials together',
    });
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const config = parsedEnv.data;

module.exports = Object.freeze({
  nodeEnv: config.NODE_ENV,
  port: config.PORT,
  mongoUri: config.MONGODB_URI,
  logLevel: config.LOG_LEVEL,
  jwtAccessSecret: config.JWT_ACCESS_SECRET,
  otpPepper: config.OTP_PEPPER,
  trustProxyHops: config.TRUST_PROXY_HOPS,
  smtp: Object.freeze({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE === 'true',
    user: config.SMTP_USER,
    password: config.SMTP_PASSWORD,
    from: config.EMAIL_FROM,
  }),
  logOtpToConsole:
    config.NODE_ENV === 'development' && config.LOG_OTP_TO_CONSOLE === 'true',
  cloudinary: Object.freeze({
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    apiSecret: config.CLOUDINARY_API_SECRET,
    folder: config.CLOUDINARY_FOLDER,
    configured: Boolean(
      config.CLOUDINARY_CLOUD_NAME &&
        config.CLOUDINARY_API_KEY &&
        config.CLOUDINARY_API_SECRET,
    ),
  }),
  corsOrigins: config.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: config.NODE_ENV === 'production',
});
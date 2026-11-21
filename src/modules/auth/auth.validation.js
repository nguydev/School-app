const { z } = require('zod');

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');
const optionalDevice = z.object({
  device_id: z.string().trim().min(1).max(128).optional(),
  device_name: z.string().trim().min(1).max(128).optional(),
});

function request(body) {
  return z.object({
    body,
    params: z.record(z.string(), z.unknown()),
    query: z.record(z.string(), z.unknown()),
  });
}

const registerStart = request(
  z.object({
    email,
    full_name: z.string().trim().min(1).max(120),
    school_name: z.string().trim().min(1).max(160),
    subject: z.string().trim().min(1).max(120),
    number: z
      .string()
      .trim()
      .min(7)
      .max(24)
      .regex(/^\+?[0-9][0-9\s()-]*$/, 'Enter a valid phone number'),
    password,
    'confirm-password': z.string().min(1).max(128),
    terms_accepted: z.literal(true),
    ...optionalDevice.shape,
  }).strict().refine((value) => value.password === value['confirm-password'], {
    path: ['confirm-password'],
    message: 'Passwords do not match',
  }),
);

const verifyRegistrationOtp = request(
  z.object({
    email,
    otp_code: z.string().regex(/^\d{6}$/),
  }).strict(),
);

const login = request(
  z.object({
    email,
    password: z.string().min(1).max(128),
    remember_me: z.boolean().default(false),
    ...optionalDevice.shape,
  }).strict(),
);

const refresh = request(
  z.object({
    refresh_token: z.string().regex(/^[A-Za-z0-9_-]{64}$/),
  }).strict(),
);

const logout = refresh;

const forgotPassword = request(z.object({ email }).strict());

const resetPassword = request(
  z.object({
    email,
    otp_code: z.string().regex(/^\d{6}$/),
    new_password: password,
    confirm_password: z.string().min(1).max(128),
  })
    .strict()
    .refine((value) => value.new_password === value.confirm_password, {
      path: ['confirm_password'],
      message: 'Passwords do not match',
    }),
);

const resendOtp = request(
  z.object({
    email,
    purpose: z.enum(['email_verification', 'password_reset']),
  }).strict(),
);

module.exports = {
  registerStart,
  verifyRegistrationOtp,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  resendOtp,
};

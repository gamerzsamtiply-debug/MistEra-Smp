import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { env } from '../env.js';
import { enforceRateLimit } from '../ratelimit.js';

// "Send the confirmation link again". Always answers the same way, so it can't be used to discover which e-mails have accounts.
export default publicEndpoint(z.object({ email: z.string().max(254) }), async ({ input, ip }) => {
  const email = input.email.trim().toLowerCase();
  await enforceRateLimit('resend-ip', ip, 10, 3600, 'Too many requests. Please try again later.');
  await enforceRateLimit('resend-acct', email, 3, 3600, 'A link was already sent recently. Please check your inbox and spam folder, or try again in an hour.');
  const site = env('SITE_URL')?.replace(/\/+$/, '');
  if (/^[^\s@]+@gmail\.com$|^[^\s@]+@googlemail\.com$/.test(email)) {
    const r = await db().auth.resend({ type: 'signup', email, options: site ? { emailRedirectTo: `${site}/login?next=%2Fwelcome` } : undefined });
    if (r.error) console.error('[auth] resend failed:', r.error.message);
  }
  return { ok: true };
});

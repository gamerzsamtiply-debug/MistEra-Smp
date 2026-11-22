import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { publicEndpoint } from '../endpoint.js';
import { ApiError, fail } from '../errors.js';
import { env, supabaseUrl } from '../env.js';
import { enforceRateLimit } from '../ratelimit.js';
import { db } from '../db.js';

const GENERIC = 'Incorrect email or password.';

// Password sign-in with brute-force protection. The browser could call Supabase directly, but that has no per-account
// lockout; going through here limits attempts per network AND per account, never reveals whether an e-mail exists,
// and refuses accounts whose Gmail address was never confirmed.
export default publicEndpoint(z.object({ email: z.string().max(254), password: z.string().min(1).max(200) }), async ({ input, ip }) => {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('BAD_REQUEST', GENERIC);
  await enforceRateLimit('login-ip', ip, 40, 900, 'Too many sign-in attempts from this network. Please wait 15 minutes and try again.');
  await enforceRateLimit('login-acct', email, 8, 900, 'Too many attempts for this account. Please wait 15 minutes, or reset your password.');
  const url = supabaseUrl();
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) { db(); throw new ApiError('SETUP', 'Server setup incomplete.'); } // db() throws the readable setup error
  // A throw-away client: signing in on the shared service client would swap its credentials.
  const tmp = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password: input.password });
  if (error || !data?.session || !data.user) {
    const status = (error as { status?: number } | null)?.status;
    if (typeof status === 'number' && status >= 500) throw new ApiError('INTERNAL', 'Authentication service unavailable');
    if (/not confirmed/i.test(error?.message ?? '')) throw fail('FORBIDDEN', 'Please confirm your Gmail address first. Check your inbox (and spam) for the confirmation link.');
    throw fail('UNAUTHORIZED', GENERIC);
  }
  if (!data.user.email_confirmed_at) throw fail('FORBIDDEN', 'Please confirm your Gmail address first. Check your inbox (and spam) for the confirmation link.');
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
});

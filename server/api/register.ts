import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { ApiError, fail } from '../errors.js';
import { ownerEmail } from '../env.js';
import { enforceRateLimit } from '../ratelimit.js';

// Creates an account that can sign in immediately: no confirmation e-mail, code or link.
// The account is created already "confirmed" through the Supabase admin API, so this works whatever the
// "Confirm email" switch in the Supabase dashboard says.
export default publicEndpoint(z.object({ email: z.string().max(254), password: z.string().min(1).max(72) }), async ({ input, ip }) => {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('BAD_REQUEST', 'Please enter a valid email address.');
  if (input.password.length < 8) throw fail('BAD_REQUEST', 'Password must be at least 8 characters.');
  await enforceRateLimit('register', ip, 10, 3600, 'Too many sign-ups from this network. Please try again later.');
  // The owner address is bound to Google sign-in so nobody can pre-register it with their own password.
  if (email === ownerEmail()) throw fail('BAD_REQUEST', 'This email address can only be used with Continue with Google.');
  const { error } = await db().auth.admin.createUser({ email, password: input.password, email_confirm: true });
  if (error) {
    const status = (error as { status?: number }).status;
    const code = (error as { code?: string }).code ?? '';
    if (code === 'email_exists' || code === 'user_already_exists' || /already|registered|exists/i.test(error.message)) throw fail('CONFLICT', 'An account with this email already exists. Try logging in instead.');
    if (code === 'weak_password' || /password/i.test(error.message)) throw fail('BAD_REQUEST', 'Please choose a stronger password (at least 8 characters).');
    if (status === 400 || status === 422) throw fail('BAD_REQUEST', 'Please check your details and try again.');
    console.error('[auth] createUser failed:', error);
    throw new ApiError('INTERNAL', 'Could not create the account');
  }
  return { ok: true };
});

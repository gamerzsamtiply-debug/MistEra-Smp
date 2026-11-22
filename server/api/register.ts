import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { ApiError, fail } from '../errors.js';
import { env, ownerEmail } from '../env.js';
import { enforceRateLimit } from '../ratelimit.js';

/** Real Gmail addresses: 6-30 letters, digits and dots, no leading/trailing/double dot. (The database enforces the same rule.) */
export function gmailProblem(emailRaw: string): string | null {
  const email = emailRaw.trim().toLowerCase();
  const m = /^([^\s@]+)@([^\s@]+)$/.exec(email);
  if (!m) return 'Please enter a valid email address.';
  if (m[2] !== 'gmail.com' && m[2] !== 'googlemail.com') return 'Please use a valid Gmail address (name@gmail.com). Other email providers are not accepted.';
  if (!/^[a-z0-9][a-z0-9.]{4,28}[a-z0-9]$/.test(m[1]) || m[1].includes('..')) return 'That does not look like a real Gmail address. Gmail addresses are 6 to 30 letters, numbers or dots.';
  return null;
}

/** The canonical form of a Gmail address (dots and googlemail.com do not make a different inbox). */
export const canonicalGmail = (email: string) => `${email.trim().toLowerCase().split('@')[0].split('+')[0].replace(/\./g, '')}@gmail.com`;

const COMMON = ['password', 'passw0rd', '12345678', '123456789', '1234567890', 'qwertyui', 'qwerty123', 'iloveyou', 'admin123', 'letmein', 'welcome1', 'minecraft', 'mistera', 'abc12345', '11111111', '00000000'];

/** Server-side password rules (the browser shows the same meter, but only this check counts). */
export function passwordProblem(pw: string, email: string): string | null {
  if (pw.length < 10) return 'Password must be at least 10 characters.';
  if (!/[a-z]/i.test(pw) || !/[0-9]/.test(pw)) return 'Password must include letters and numbers.';
  const low = pw.toLowerCase();
  if (COMMON.some((c) => low.includes(c))) return 'That password is too common. Please choose a different one.';
  if (/(.)\1{3,}/.test(pw)) return 'Please avoid repeating the same character many times.';
  const local = email.split('@')[0].replace(/[^a-z0-9]/g, '');
  if (local.length >= 5 && low.includes(local)) return 'Your password should not contain your email name.';
  return null;
}

// Creates an account that is NOT usable until the person clicks the confirmation link we e-mail to their Gmail address.
// That link is the proof the Gmail address is real and theirs. Only Gmail addresses are accepted.
export default publicEndpoint(z.object({ email: z.string().max(254), password: z.string().min(1).max(72) }), async ({ input, ip }) => {
  const email = input.email.trim().toLowerCase();
  const bad = gmailProblem(email);
  if (bad) throw fail('BAD_REQUEST', bad);
  const pwBad = passwordProblem(input.password, email);
  if (pwBad) throw fail('BAD_REQUEST', pwBad);
  await enforceRateLimit('register', ip, 6, 3600, 'Too many sign-ups from this network. Please try again later.');
  // The owner address is bound to Google sign-in so nobody can pre-register it with their own password.
  if (canonicalGmail(email) === canonicalGmail(ownerEmail())) throw fail('BAD_REQUEST', 'This email address can only be used with Continue with Google.');
  const { error } = await db().auth.admin.createUser({ email, password: input.password, email_confirm: false });
  if (error) {
    const status = (error as { status?: number }).status;
    const code = (error as { code?: string }).code ?? '';
    if (code === 'email_exists' || code === 'user_already_exists' || /already|registered|exists/i.test(error.message)) throw fail('CONFLICT', 'An account with this email already exists. Try logging in instead.');
    if (code === 'weak_password' || /password/i.test(error.message)) throw fail('BAD_REQUEST', 'Please choose a stronger password.');
    if (/gmail/i.test(error.message)) throw fail('BAD_REQUEST', 'Please use a valid Gmail address that is not already registered.');
    if (status === 400 || status === 422) throw fail('BAD_REQUEST', 'Please check your details and try again.');
    console.error('[auth] createUser failed:', error);
    throw new ApiError('INTERNAL', 'Could not create the account');
  }
  // Sends the confirmation e-mail (Supabase's own mailer; set a custom SMTP in Supabase for reliable delivery).
  const site = env('SITE_URL')?.replace(/\/+$/, '');
  const sent = await db().auth.resend({ type: 'signup', email, options: site ? { emailRedirectTo: `${site}/login?next=%2Fwelcome` } : undefined });
  if (sent.error) {
    console.error('[auth] resend confirmation failed:', sent.error);
    // The account exists; the person can request another link from the sign-in page.
    return { ok: true, confirmationSent: false };
  }
  return { ok: true, confirmationSent: true };
});

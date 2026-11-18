import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile, hashClaimCode, normalizeClaimCode, logActivity } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import type { StaffRow } from '../types.js';

// A signed-in user links their account to the staff entry an admin created for them, using the one-time code.
export default authEndpoint(z.object({ code: z.string().max(64) }), async ({ input, user, ip }) => {
  const me = await ensureProfile(user);
  await enforceRateLimit('claimStaff-user', user.id, 8, 3600, 'Too many attempts. Please try again later.');
  await enforceRateLimit('claimStaff-ip', ip, 30, 3600, 'Too many attempts. Please try again later.');
  const code = normalizeClaimCode(input.code);
  const bad = fail('NOT_FOUND', 'That code is invalid or has expired.');
  if (code.length !== 16) throw bad;
  const already = must(await db().from('staff_members').select('id').eq('profile_id', me.id).maybeSingle(), 'staff_members.mine') as { id: string } | null;
  if (already) throw fail('CONFLICT', 'Your account is already linked to a staff profile.');
  const hash = hashClaimCode(code);
  const s = must(await db().from('staff_members').select('id,name,claim_expires').eq('claim_hash', hash).is('profile_id', null).maybeSingle(), 'staff_members.byCode') as Pick<StaffRow, 'id' | 'name' | 'claim_expires'> | null;
  if (!s || !s.claim_expires || new Date(s.claim_expires).getTime() < Date.now()) throw bad;
  // Conditional update: succeeds for exactly one caller even if the code is submitted twice at once.
  const rows = must(await db().from('staff_members').update({ profile_id: me.id, claim_hash: null, claim_expires: null }).eq('id', s.id).eq('claim_hash', hash).is('profile_id', null).select('id'), 'staff_members.claim') as { id: string }[] | null;
  if (!rows?.length) throw bad;
  await logActivity(user, 'Staff linked own account', `Staff ${s.name}`, `@${me.username}`);
  return { ok: true, name: s.name ?? '' };
});

import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isUniqueViolation } from '../db.js';
import { fail } from '../errors.js';
import { cleanUploadedImageUrl, ensureProfile } from '../lib.js';

// Updates the signed-in user's own username, bio, avatar and (optionally) banner
export default authEndpoint(z.object({ username: z.string().max(100), bio: z.string().max(5000), avatarUrl: z.string().max(4096), bannerUrl: z.string().max(4096).optional() }), async ({ input, user }) => {
  const p = await ensureProfile(user);
  const username = input.username.trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw fail('BAD_REQUEST', 'Username must be 3–20 characters: letters, numbers or underscores.');
  if (input.bio.length > 300) throw fail('BAD_REQUEST', 'Bio must be 300 characters or fewer.');
  const taken = must(await db().from('profiles').select('id').eq('username', username).maybeSingle(), 'profiles.usernameTaken') as { id: string } | null;
  if (taken && taken.id !== p.id) throw fail('CONFLICT', 'That username is already taken. Try another one.');
  const avatar = cleanUploadedImageUrl(input.avatarUrl, p.avatar_url);
  const patch: Record<string, string> = { username, bio: input.bio.trim(), avatar_url: avatar };
  // The banner is only written when the client sends it, so profiles keep working until migration 0008 has been run.
  if (input.bannerUrl !== undefined) patch.banner_url = cleanUploadedImageUrl(input.bannerUrl, p.banner_url);
  const r = await db().from('profiles').update(patch).eq('id', p.id);
  if (r.error && isUniqueViolation(r.error)) throw fail('CONFLICT', 'That username is already taken. Try another one.');
  must(r, 'profiles.updateMine');
  return { ok: true };
});

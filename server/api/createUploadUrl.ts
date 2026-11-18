import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import { randomUUID } from 'node:crypto';

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
export const UPLOAD_BUCKET = 'uploads';
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Replaces Zite's file upload: returns a short-lived signed upload URL for a signed-in user.
// The browser uploads straight to Supabase Storage (so Vercel's request-size limit never applies);
// the file name and folder are chosen here, never by the client.
export default authEndpoint(z.object({ contentType: z.string().max(100), size: z.number() }), async ({ input, user }) => {
  await ensureProfile(user);
  await enforceRateLimit('createUploadUrl', user.id, 30, 3600, 'You are uploading too many images. Please try again later.');
  const ext = TYPES[input.contentType];
  if (!ext) throw fail('BAD_REQUEST', 'Unsupported image format. Please use PNG, JPG, WEBP or GIF.');
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_UPLOAD_BYTES) throw fail('BAD_REQUEST', 'Images must be 5 MB or smaller.');
  const path = `${user.id}/${randomUUID()}.${ext}`;
  const signed = must(await db().storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path), 'storage.createSignedUploadUrl') as { token: string; path: string };
  const pub = db().storage.from(UPLOAD_BUCKET).getPublicUrl(path);
  return { bucket: UPLOAD_BUCKET, path: signed.path ?? path, token: signed.token, publicUrl: pub.data.publicUrl };
});

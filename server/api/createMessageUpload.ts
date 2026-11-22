import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, MESSAGE_BUCKET, requireVerified } from '../social.js';

// Short-lived signed upload URL for a chat attachment (private bucket, folder = the sender's own user id).
export default authEndpoint(z.object({ contentType: z.string().max(120), size: z.number() }), async ({ input, user }) => {
  requireVerified(user);
  await ensureProfile(user);
  await enforceRateLimit('messageUpload', user.id, 40, 3600, 'You are sending too many files. Please try again later.');
  const ext = ATTACHMENT_TYPES[input.contentType];
  if (!ext) throw fail('BAD_REQUEST', 'That file type is not allowed. You can send images, PDF, Office documents, text, ZIP, audio and short videos.');
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > ATTACHMENT_MAX_BYTES) throw fail('BAD_REQUEST', 'Files must be 25 MB or smaller.');
  const path = `${user.id}/${randomUUID()}.${ext}`;
  const signed = must(await db().storage.from(MESSAGE_BUCKET).createSignedUploadUrl(path), 'storage.createSignedUploadUrl(message)') as { token: string; path: string };
  return { bucket: MESSAGE_BUCKET, path: signed.path ?? path, token: signed.token };
});

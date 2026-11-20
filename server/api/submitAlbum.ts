import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { cleanUploadedMediaUrl, countRows, ensureProfile } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';

// Submits a photo or video to the community album for review
export default authEndpoint(z.object({ imageUrl: z.string().max(4096), caption: z.string().max(2000), mediaType: z.enum(['image', 'video']).default('image') }), async ({ input, user }) => {
  await ensureProfile(user);
  await enforceRateLimit('submitAlbum', user.id, 20, 3600, 'You are submitting too quickly. Please try again later.');
  const url = cleanUploadedMediaUrl(input.imageUrl, input.mediaType);
  if (!url) throw fail('BAD_REQUEST', 'Please choose a photo or video to upload.');
  if (input.caption.length > 300) throw fail('BAD_REQUEST', 'Caption must be 300 characters or fewer.');
  const pending = await countRows('album_submissions', (q) => q.eq('uploader', user.id).eq('status', 'Pending'));
  if (pending >= 10) throw fail('RATE_LIMITED', 'You have 10 posts waiting for review. Please wait until some are reviewed.');
  must(await db().from('album_submissions').insert({ image_url: url, media_type: input.mediaType, caption: input.caption.trim(), uploader: user.id, status: 'Pending' }), 'album.submit');
  return { ok: true };
});

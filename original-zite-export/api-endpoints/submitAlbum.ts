import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ensureProfile, fail, cleanUrl } from '../server/lib';

export default createEndpoint({
  description: 'Submits an image to the community album for review',
  authenticated: true,
  inputSchema: z.object({ imageUrl: z.string(), caption: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await ensureProfile(context);
    const url = cleanUrl(input.imageUrl);
    if (!url) throw fail('BAD_REQUEST', 'Please choose an image to upload.');
    if (input.caption.length > 120) throw fail('BAD_REQUEST', 'Caption must be 120 characters or fewer.');
    const { records } = await zite.albumSubmissions.findAll({ filters: { uploader: context.user.id, status: 'Pending' }, limit: 20 });
    if (records.length >= 10) throw fail('RATE_LIMITED', 'You have 10 images waiting for review. Please wait until some are reviewed.');
    await zite.albumSubmissions.create({ record: { imageUrl: url, caption: input.caption.trim(), uploader: context.user.id, status: 'Pending' } });
    return { ok: true };
  },
});

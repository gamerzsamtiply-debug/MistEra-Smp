import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { fail, uid } from '../server/lib';

export default createEndpoint({
  description: 'Deletes one of the signed-in user own album submissions',
  authenticated: true,
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    const a = await zite.albumSubmissions.findOne({ id: input.id });
    if (!a || uid(a.uploader) !== context.user.id) throw fail('FORBIDDEN', 'You can only manage your own submissions.');
    await zite.albumSubmissions.delete({ id: a.id });
    return { ok: true };
  },
});

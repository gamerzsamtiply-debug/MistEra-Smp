import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ensureProfile, fail, cleanUrl } from '../server/lib';

export default createEndpoint({
  description: 'Updates the signed-in user own username, bio and avatar',
  authenticated: true,
  inputSchema: z.object({ username: z.string(), bio: z.string(), avatarUrl: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    const p = await ensureProfile(context);
    const username = input.username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw fail('BAD_REQUEST', 'Username must be 3–20 characters: letters, numbers or underscores.');
    if (input.bio.length > 300) throw fail('BAD_REQUEST', 'Bio must be 300 characters or fewer.');
    const taken = await zite.profiles.findOne({ filters: { username } });
    if (taken && taken.id !== p.id) throw fail('CONFLICT', 'That username is already taken. Try another one.');
    await zite.profiles.update({ id: p.id, record: { username, bio: input.bio.trim(), avatarUrl: cleanUrl(input.avatarUrl) } });
    return { ok: true };
  },
});

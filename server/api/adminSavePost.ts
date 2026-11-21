import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { isUuid } from '../db.js';
import { cleanUrl, logActivity, requireAdmin } from '../lib.js';

// Creates, edits, publishes or unpublishes an announcement or update
export default authEndpoint(
  z.object({ id: z.string().max(64).optional(), kind: z.enum(['Announcement', 'Update']), title: z.string().max(300), body: z.string().max(30000), imageUrl: z.string().max(4096), published: z.boolean(), publishedAt: z.string().max(64) }),
  async ({ input, user }) => {
    await requireAdmin(user);
    if (input.title.trim().length < 3) throw fail('BAD_REQUEST', 'Title must be at least 3 characters.');
    if (!input.body.trim()) throw fail('BAD_REQUEST', 'Description is required.');
    const date = input.publishedAt ? new Date(input.publishedAt) : new Date();
    if (isNaN(date.getTime())) throw fail('BAD_REQUEST', 'Please choose a valid publication date.');
    const record = { kind: input.kind, title: input.title.trim(), body: input.body.trim(), image_url: cleanUrl(input.imageUrl), published: input.published, published_at: date.toISOString() };
    if (input.id) {
      if (!isUuid(input.id)) throw fail('NOT_FOUND', 'That post no longer exists.');
      const rows = must(await db().from('posts').update(record).eq('id', input.id).select('id'), 'posts.update') as { id: string }[] | null;
      if (!rows?.length) throw fail('NOT_FOUND', 'That post no longer exists.');
    } else {
      must(await db().from('posts').insert(record), 'posts.insert');
    }
    await logActivity(user, `${input.id ? 'Edited' : 'Created'} ${input.kind.toLowerCase()}${input.published ? ' (published)' : ' (draft)'}`, `${input.kind}: ${record.title}`);
    return { ok: true };
  },
);

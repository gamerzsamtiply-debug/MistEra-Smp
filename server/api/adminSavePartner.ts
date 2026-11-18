import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { isUuid } from '../db.js';
import { cleanUrl, logActivity, requireAdmin } from '../lib.js';

// Creates or updates a partner
export default authEndpoint(
  z.object({ id: z.string().max(64).optional(), name: z.string().max(200), category: z.enum(['Discord', 'Hosting', 'Shop', 'Server', 'SMP', 'Community']), description: z.string().max(5000), logoUrl: z.string().max(4096), websiteUrl: z.string().max(4096) }),
  async ({ input, user }) => {
    await requireAdmin(user);
    if (input.name.trim().length < 2) throw fail('BAD_REQUEST', 'Partner name is required.');
    const record = { name: input.name.trim(), category: input.category, description: input.description.trim().slice(0, 600), logo_url: cleanUrl(input.logoUrl), website_url: cleanUrl(input.websiteUrl) };
    if (input.id) {
      if (!isUuid(input.id)) throw fail('NOT_FOUND', 'That partner no longer exists.');
      const rows = must(await db().from('partners').update(record).eq('id', input.id).select('id'), 'partners.update') as { id: string }[] | null;
      if (!rows?.length) throw fail('NOT_FOUND', 'That partner no longer exists.');
    } else {
      must(await db().from('partners').insert(record), 'partners.insert');
    }
    await logActivity(user, input.id ? 'Updated partner' : 'Added partner', `Partner ${record.name}`);
    return { ok: true };
  },
);

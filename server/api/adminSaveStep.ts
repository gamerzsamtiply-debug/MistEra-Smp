import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { cleanUrl, logActivity, requireAdmin } from '../lib.js';

// Saves one How to Join step (Step 1 is always enabled)
export default authEndpoint(
  z.object({ slot: z.number(), title: z.string().max(300), instructions: z.string().max(10000), imageUrl: z.string().max(4096), enabled: z.boolean(), sortOrder: z.number().finite() }),
  async ({ input, user }) => {
    await requireAdmin(user);
    if (![1, 2, 3, 4, 5].includes(input.slot)) throw fail('BAD_REQUEST', 'Unknown step.');
    const enabled = input.slot === 1 ? true : input.enabled;
    if ((input.slot === 1 || enabled) && (!input.title.trim() || !input.instructions.trim())) throw fail('BAD_REQUEST', 'An enabled step needs both a title and instructions.');
    const record = {
      slot: input.slot,
      title: input.title.trim(),
      instructions: input.instructions.trim(),
      image_url: cleanUrl(input.imageUrl),
      enabled,
      sort_order: input.slot === 1 ? 1 : Math.max(2, Math.min(5, Math.round(input.sortOrder))),
    };
    must(await db().from('join_steps').upsert(record, { onConflict: 'slot' }), 'join_steps.upsert');
    await logActivity(user, `Updated whitelist guide step ${input.slot}`, 'Whitelist Guide', `${record.title} (${enabled ? 'enabled' : 'disabled'}, position ${record.sort_order})`);
    return { ok: true };
  },
);

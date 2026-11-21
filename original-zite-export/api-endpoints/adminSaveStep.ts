import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, cleanUrl, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Saves one How to Join step (Step 1 is always enabled)',
  authenticated: true,
  inputSchema: z.object({ slot: z.number(), title: z.string(), instructions: z.string(), imageUrl: z.string(), enabled: z.boolean(), sortOrder: z.number() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    if (![1, 2, 3, 4, 5].includes(input.slot)) throw fail('BAD_REQUEST', 'Unknown step.');
    const enabled = input.slot === 1 ? true : input.enabled;
    if ((input.slot === 1 || enabled) && (!input.title.trim() || !input.instructions.trim())) throw fail('BAD_REQUEST', 'An enabled step needs both a title and instructions.');
    const record = { slot: input.slot, title: input.title.trim(), instructions: input.instructions.trim(), imageUrl: cleanUrl(input.imageUrl), enabled, sortOrder: input.slot === 1 ? 1 : Math.max(2, Math.min(5, Math.round(input.sortOrder))) };
    const existing = await zite.joinSteps.findOne({ filters: { slot: input.slot } });
    if (existing) await zite.joinSteps.update({ id: existing.id, record });
    else await zite.joinSteps.create({ record });
    await logActivity(context, `Updated whitelist guide step ${input.slot}`, 'Whitelist Guide', `${record.title} (${enabled ? 'enabled' : 'disabled'}, position ${record.sortOrder})`);
    return { ok: true };
  },
});

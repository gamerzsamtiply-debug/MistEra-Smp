import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin } from '../server/lib';

export default createEndpoint({
  description: 'Lists all five How to Join step slots for admins',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    await requireAdmin(context);
    const { records } = await zite.joinSteps.findAll({ limit: 20 });
    return {
      steps: [1, 2, 3, 4, 5].map((slot) => {
        const r = records.find((x) => x.slot === slot);
        return { slot, id: r?.id ?? null, title: r?.title ?? '', instructions: r?.instructions ?? '', imageUrl: r?.imageUrl ?? '', enabled: slot === 1 ? true : !!r?.enabled, sortOrder: r?.sortOrder ?? slot };
      }),
    };
  },
});

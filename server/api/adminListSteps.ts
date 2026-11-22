import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { requireAdmin } from '../lib.js';
import type { JoinStepRow } from '../types.js';

// Lists all five How to Join step slots for admins
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const rows = (must(await db().from('join_steps').select('*').limit(20), 'join_steps.list') ?? []) as JoinStepRow[];
  return {
    steps: [1, 2, 3, 4, 5].map((slot) => {
      const r = rows.find((x) => x.slot === slot);
      return { slot, id: r?.id ?? null, title: r?.title ?? '', instructions: r?.instructions ?? '', imageUrl: r?.image_url ?? '', enabled: slot === 1 ? true : !!r?.enabled, sortOrder: r?.sort_order ?? slot };
    }),
  };
});

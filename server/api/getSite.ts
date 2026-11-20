import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, mustOr } from '../db.js';
import { getSettingsRow, settingsOut } from '../lib.js';
import type { JoinStepRow } from '../types.js';

// Returns public server settings and the enabled How to Join steps
export default publicEndpoint(z.object({}), async () => {
  const s = await getSettingsRow();
  const rows = (mustOr(await db().from('join_steps').select('*').limit(20), 'join_steps.list', []) ?? []) as JoinStepRow[];
  const steps = rows
    .filter((r) => r.slot === 1 || (r.enabled && (r.title ?? '').trim() && (r.instructions ?? '').trim()))
    .sort((a, b) => (a.slot === 1 ? -1 : b.slot === 1 ? 1 : (a.sort_order ?? 9) - (b.sort_order ?? 9)))
    .map((r) => ({ id: r.id, title: r.title ?? '', instructions: r.instructions ?? '', imageUrl: r.image_url ?? '' }));
  return { settings: settingsOut(s), steps };
});

import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow, logActivity, requireAdmin } from '../lib.js';
import type { PartnerRow } from '../types.js';

// Deletes a partner
export default authEndpoint(z.object({ id: z.string().max(64) }), async ({ input, user }) => {
  await requireAdmin(user);
  const p = await findRow<PartnerRow>('partners', input.id);
  if (!p) throw fail('NOT_FOUND', 'That partner was already removed.');
  must(await db().from('partners').delete().eq('id', p.id), 'partners.delete');
  await logActivity(user, 'Deleted partner', `Partner ${p.name}`);
  return { ok: true };
});

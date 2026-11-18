import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { STAFF_ROLES, toPublicUser } from '../lib.js';
import type { ProfileRow } from '../types.js';

// Lists staff members (the page groups them by role)
export default publicEndpoint(z.object({}), async () => {
  const r = await db().from('profiles').select('*').in('role', STAFF_ROLES).order('joined_at', { ascending: true }).limit(1000);
  const rows = (must(r, 'profiles.staff') ?? []) as ProfileRow[];
  return { staff: rows.map(toPublicUser) };
});

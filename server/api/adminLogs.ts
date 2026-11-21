import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { requireAdmin } from '../lib.js';
import type { ActivityLogRow, ErrorLogRow } from '../types.js';

// Returns read-only activity or error logs for admins
export default authEndpoint(z.object({ type: z.enum(['activity', 'error']) }), async ({ input, user }) => {
  await requireAdmin(user);
  if (input.type === 'activity') {
    const rows = (must(await db().from('activity_logs').select('*').order('logged_at', { ascending: false }).limit(500), 'activity_logs.list') ?? []) as ActivityLogRow[];
    return { logs: rows.map((l) => ({ id: l.id, a: l.action ?? '', b: l.resource ?? '', c: l.details ?? '', who: l.admin_email ?? '', at: l.logged_at ?? '' })) };
  }
  const rows = (must(await db().from('error_logs').select('*').order('logged_at', { ascending: false }).limit(500), 'error_logs.list') ?? []) as ErrorLogRow[];
  return { logs: rows.map((l) => ({ id: l.id, a: l.operation ?? '', b: l.category ?? '', c: l.message ?? '', who: l.correlation_id ?? '', at: l.logged_at ?? '' })) };
});

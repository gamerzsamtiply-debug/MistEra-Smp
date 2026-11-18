import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { countRows, requireAdmin, STAFF_ROLES } from '../lib.js';
import type { ActivityLogRow } from '../types.js';

// Returns admin dashboard counts and recent activity
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const [users, staff, partners, pending, suggestions, openSuggestions, recentRows] = await Promise.all([
    countRows('profiles'),
    countRows('profiles', (q) => q.in('role', STAFF_ROLES)),
    countRows('partners'),
    countRows('album_submissions', (q) => q.eq('status', 'Pending')),
    countRows('suggestions'),
    countRows('suggestions', (q) => q.eq('status', 'Open')),
    db().from('activity_logs').select('*').order('logged_at', { ascending: false }).limit(10),
  ]);
  const recent = (must(recentRows, 'activity_logs.recent') ?? []) as ActivityLogRow[];
  return {
    counts: { users, staff, partners, pending, suggestions, openSuggestions },
    recent: recent.map((l) => ({ id: l.id, action: l.action ?? '', resource: l.resource ?? '', adminEmail: l.admin_email ?? '', loggedAt: l.logged_at ?? '' })),
  };
});

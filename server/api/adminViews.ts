import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { requireAdmin } from '../lib.js';

// Admin only: how many people viewed the website, per page and per day, plus the recent login log.
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const [sum, logins] = await Promise.all([
    db().rpc('site_view_summary', { p_days: 14 }),
    db().from('login_events').select('id,email,method,ip,created_at').order('created_at', { ascending: false }).limit(200),
  ]);
  if (sum.error) console.error('[db] site_view_summary (is migration 0007 applied?):', sum.error);
  const s = (sum.data ?? {}) as { total?: number; unique?: number; today?: number; last7?: number; daily?: { day: string; views: number; visitors: number }[]; topPages?: { path: string; views: number }[] };
  return {
    ready: !sum.error,
    total: Number(s.total) || 0,
    unique: Number(s.unique) || 0,
    today: Number(s.today) || 0,
    last7: Number(s.last7) || 0,
    daily: s.daily ?? [],
    topPages: s.topPages ?? [],
    logins: ((logins.data ?? []) as { id: number; email: string; method: string; ip: string; created_at: string }[]).map((l) => ({ id: String(l.id), email: l.email, method: l.method, ip: l.ip, at: l.created_at })),
  };
});

import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, selectAll } from '../db.js';
import { requireAdmin } from '../lib.js';

interface FeedbackRow { id: string; name: string | null; contact: string | null; message: string | null; created_at: string | null }

// Lists feedback for admins
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const rows = await selectAll<FeedbackRow>((from, to) => db().from('feedback').select('*').order('created_at', { ascending: false }).range(from, to), 1000, 'feedback.adminList');
  return { items: rows.map((f) => ({ id: f.id, name: f.name ?? '', contact: f.contact ?? '', message: f.message ?? '', createdAt: f.created_at ?? '' })) };
});

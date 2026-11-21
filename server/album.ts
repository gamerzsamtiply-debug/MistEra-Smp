import { db } from './db.js';

export interface AlbumStats { likes: number; comments: number; liked: boolean }

/**
 * Like/comment counts for many album posts in one query (SQL function album_stats, migration 0005).
 * If the migration has not been run yet this returns zeros, so the album itself keeps working.
 */
export async function albumStats(ids: string[], userId?: string | null): Promise<Map<string, AlbumStats>> {
  const out = new Map<string, AlbumStats>();
  for (const id of ids) out.set(id, { likes: 0, comments: 0, liked: false });
  if (!ids.length) return out;
  try {
    const r = await db().rpc('album_stats', { p_ids: ids, p_user: userId ?? null });
    if (r.error) {
      console.error('[db] album_stats (is migration 0005 applied?):', r.error);
      return out;
    }
    for (const row of (r.data ?? []) as { submission_id: string; likes: number | string; comments: number | string; liked: boolean }[]) {
      out.set(row.submission_id, { likes: Number(row.likes) || 0, comments: Number(row.comments) || 0, liked: !!row.liked });
    }
  } catch (e) {
    console.error('[db] album_stats threw:', e);
  }
  return out;
}

/** View counts for many album posts (SQL function album_view_counts, migration 0007). Returns zeros if it is not applied yet. */
export async function albumViewCounts(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const id of ids) out.set(id, 0);
  if (!ids.length) return out;
  try {
    const r = await db().rpc('album_view_counts', { p_ids: ids });
    if (r.error) {
      console.error('[db] album_view_counts (is migration 0007 applied?):', r.error);
      return out;
    }
    for (const row of (r.data ?? []) as { submission_id: string; views: number | string }[]) out.set(row.submission_id, Number(row.views) || 0);
  } catch (e) {
    console.error('[db] album_view_counts threw:', e);
  }
  return out;
}

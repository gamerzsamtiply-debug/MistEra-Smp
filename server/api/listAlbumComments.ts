import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow, profileMap } from '../lib.js';
import type { AlbumCommentRow, AlbumRow, ProfileRow } from '../types.js';

// Comments and replies of one approved album post, oldest first
export default optionalAuthEndpoint(z.object({ id: z.string().max(64) }), async ({ input, user }) => {
  const post = await findRow<AlbumRow>('album_submissions', input.id);
  if (!post || post.status !== 'Approved') throw fail('NOT_FOUND', 'That post is no longer available.');
  const rows = (must(await db().from('album_comments').select('*').eq('submission_id', post.id).order('created_at', { ascending: true }).limit(500), 'album_comments.list') ?? []) as AlbumCommentRow[];
  const pm = await profileMap(rows.map((c) => c.user_id));
  let canModerate = false;
  if (user) {
    const me = must(await db().from('profiles').select('role').eq('user_id', user.id).maybeSingle(), 'profiles.roleOf') as Pick<ProfileRow, 'role'> | null;
    canModerate = me?.role === 'Owner' || me?.role === 'Admin' || me?.role === 'Moderator';
  }
  return {
    comments: rows.map((c) => ({
      id: c.id,
      parentId: c.parent_id,
      body: c.body ?? '',
      createdAt: c.created_at ?? '',
      user: pm.get(c.user_id) ?? null,
      canDelete: !!user && (c.user_id === user.id || canModerate),
    })),
  };
});

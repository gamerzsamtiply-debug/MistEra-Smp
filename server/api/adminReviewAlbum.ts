import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, mustOr } from '../db.js';
import { fail } from '../errors.js';
import { findRow, logActivity, requireModerator } from '../lib.js';
import { clip, notify } from '../social.js';
import { pushToAll } from '../push.js';
import type { AlbumRow } from '../types.js';

// Approves or declines an album submission (Moderators, Admins, Owner). Deleting one for good is Admin/Owner only.
export default authEndpoint(z.object({ id: z.string().max(64), action: z.enum(['Approved', 'Declined', 'Delete']) }), async ({ input, user }) => {
  const me = await requireModerator(user);
  if (input.action === 'Delete' && me.role === 'Moderator') throw fail('FORBIDDEN', 'Only Admins can delete album posts permanently. You can decline it instead.');
  const a = await findRow<AlbumRow>('album_submissions', input.id);
  if (!a) throw fail('NOT_FOUND', 'That submission no longer exists.');
  if (input.action === 'Delete') must(await db().from('album_submissions').delete().eq('id', a.id), 'album.delete');
  else must(await db().from('album_submissions').update({ status: input.action }).eq('id', a.id), 'album.review');
  // A newly approved post / video tells the uploader and everyone who follows them
  if (input.action === 'Approved' && a.status !== 'Approved' && a.uploader) {
    const up = a.uploader;
    const fr = mustOr(await db().from('follows').select('follower_id').eq('following_id', up).limit(1000), 'follows.followersOf', [] as { follower_id: string }[]) ?? [];
    const pr = mustOr(await db().from('profiles').select('username').eq('user_id', up).maybeSingle(), 'profiles.nameOf', null as { username: string } | null);
    const name = pr?.username ?? 'A member';
    const what = a.media_type === 'video' ? 'a new video' : 'a new post';
    await notify([
      { userId: up, actorId: null, type: 'post', title: 'Your post was approved', body: clip(a.caption ?? '', 100), url: '/album' },
      ...fr.map((f) => ({ userId: f.follower_id, actorId: up, type: 'post' as const, title: `@${name} shared ${what}`, body: clip(a.caption ?? '', 100), url: '/album' })),
    ]);
    // everyone else who allowed notifications (including guests) hears about it too; the uploader and followers already got a personal one
    await pushToAll({ title: `@${name} shared ${what}`, body: clip(a.caption ?? '', 100), url: `/album/${a.id}`, tag: `album-${a.id}` }, [up, ...fr.map((f) => f.follower_id)]);
  }
  await logActivity(user, input.action === 'Delete' ? 'Deleted album image' : `${input.action} album image`, 'Community Album', a.caption || a.image_url || '');
  return { ok: true };
});

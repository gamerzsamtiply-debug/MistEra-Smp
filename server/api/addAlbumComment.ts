import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile, findRow, toPublicUser } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import { clip, notify } from '../social.js';
import { cleanGuestName, requireGuestKey } from '../guest.js';
import type { AlbumCommentRow, AlbumRow } from '../types.js';

// Adds a comment (or a reply, when parentId is given) to an approved album post.
// Guests must send their anonymous visitorId and a chosen guestName.
export default optionalAuthEndpoint(
  z.object({ id: z.string().max(64), body: z.string().max(2000), parentId: z.string().max(64).nullish(), visitorId: z.string().max(64).optional(), guestName: z.string().max(60).optional() }),
  async ({ input, user, ip }) => {
    const profile = user ? await ensureProfile(user) : null;
    const guestKey = user ? null : requireGuestKey(input.visitorId);
    const guestName = user ? null : cleanGuestName(input.guestName);
    await enforceRateLimit('albumComment', user ? user.id : `${ip}|${guestKey}`, user ? 40 : 15, 3600, 'You are commenting too quickly. Please try again in a little while.');
    const body = input.body.trim();
    if (!body) throw fail('BAD_REQUEST', 'Please write something first.');
    if (body.length > 500) throw fail('BAD_REQUEST', 'Comments can be up to 500 characters.');
    const post = await findRow<AlbumRow>('album_submissions', input.id);
    if (!post || post.status !== 'Approved') throw fail('NOT_FOUND', 'That post is no longer available.');

    let parentId: string | null = null;
    if (input.parentId) {
      const parent = await findRow<AlbumCommentRow>('album_comments', input.parentId);
      if (!parent || parent.submission_id !== post.id) throw fail('NOT_FOUND', 'The comment you are replying to no longer exists.');
      parentId = parent.parent_id ?? parent.id; // replies stay one level deep
    }
    const row = must(await db().from('album_comments').insert({ submission_id: post.id, user_id: user ? user.id : null, guest_key: guestKey, guest_name: guestName, parent_id: parentId, body }).select('*').single(), 'album_comments.insert') as AlbumCommentRow;
    // tell the owner of the post (never the commenter themselves); guests show as "Name (guest)"
    const who = profile ? `@${profile.username ?? 'Someone'}` : `${guestName} (guest)`;
    await notify([{ userId: post.uploader ?? '', actorId: user ? user.id : null, type: 'comment', title: `${who} commented on your post`, body: clip(body, 120), url: `/album/${post.id}` }]);
    return { comment: { id: row.id, parentId: row.parent_id, body: row.body ?? '', createdAt: row.created_at ?? '', user: profile ? toPublicUser(profile) : null, guestName, canDelete: true } };
  },
);

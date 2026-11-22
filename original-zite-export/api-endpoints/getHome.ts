import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { profileMap, uid } from '../server/lib';

export default createEndpoint({
  description: 'Returns homepage previews: latest posts, staff, partners and album',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const [posts, partners, album, pm] = await Promise.all([
      zite.posts.findAll({ filters: { published: true }, sort: [{ field: 'publishedAt', direction: 'desc' }], limit: 40 }),
      zite.partners.findAll({ limit: 6 }),
      zite.albumSubmissions.findAll({ filters: { status: 'Approved' }, sort: [{ field: 'submittedAt', direction: 'desc' }], limit: 8 }),
      profileMap(),
    ]);
    const mapPost = (p: (typeof posts.records)[0]) => ({ id: p.id, title: p.title ?? '', body: p.body ?? '', imageUrl: p.imageUrl ?? '', publishedAt: p.publishedAt ?? '' });
    const order = ['Owner', 'Admin', 'Moderator', 'Staff'];
    const staff = [...pm.values()].filter((p) => order.includes(p.role)).sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).slice(0, 8);
    return {
      announcements: posts.records.filter((p) => p.kind === 'Announcement').slice(0, 3).map(mapPost),
      updates: posts.records.filter((p) => p.kind === 'Update').slice(0, 3).map(mapPost),
      partners: partners.records.map((p) => ({ id: p.id, name: p.name ?? '', category: p.category ?? '', logoUrl: p.logoUrl ?? '', websiteUrl: p.websiteUrl ?? '', description: p.description ?? '' })),
      album: album.records.map((a) => ({ id: a.id, imageUrl: a.imageUrl ?? '', caption: a.caption ?? '', uploader: pm.get(uid(a.uploader)) ?? null })),
      staff,
    };
  },
});

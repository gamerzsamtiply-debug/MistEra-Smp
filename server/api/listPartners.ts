import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import type { PartnerRow } from '../types.js';

// Lists all partners
export default publicEndpoint(z.object({}), async () => {
  const r = await db().from('partners').select('*').order('name', { ascending: true }).limit(500);
  const rows = (must(r, 'partners.list') ?? []) as PartnerRow[];
  return { partners: rows.map((p) => ({ id: p.id, name: p.name ?? '', category: p.category ?? 'Community', description: p.description ?? '', logoUrl: p.logo_url ?? '', websiteUrl: p.website_url ?? '' })) };
});

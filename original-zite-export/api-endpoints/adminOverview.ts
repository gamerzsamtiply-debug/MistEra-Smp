import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin } from '../server/lib';

export default createEndpoint({
  description: 'Returns admin dashboard counts and recent activity',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    await requireAdmin(context);
    const { rows } = await zite.sql({ query: `SELECT
      (SELECT COUNT(*) FROM "Profiles") AS users,
      (SELECT COUNT(*) FROM "Profiles" WHERE "role" IN ('Owner','Admin','Moderator','Staff')) AS staff,
      (SELECT COUNT(*) FROM "Partners") AS partners,
      (SELECT COUNT(*) FROM "AlbumSubmissions" WHERE "status" = 'Pending') AS pending,
      (SELECT COUNT(*) FROM "Suggestions") AS suggestions,
      (SELECT COUNT(*) FROM "Suggestions" WHERE "status" = 'Open') AS "openSuggestions"` });
    const r = rows[0] ?? {};
    const { records } = await zite.activityLogs.findAll({ sort: [{ field: 'loggedAt', direction: 'desc' }], limit: 10 });
    return {
      counts: { users: Number(r.users ?? 0), staff: Number(r.staff ?? 0), partners: Number(r.partners ?? 0), pending: Number(r.pending ?? 0), suggestions: Number(r.suggestions ?? 0), openSuggestions: Number(r.openSuggestions ?? 0) },
      recent: records.map((l) => ({ id: l.id, action: l.action ?? '', resource: l.resource ?? '', adminEmail: l.adminEmail ?? '', loggedAt: l.loggedAt ?? '' })),
    };
  },
});

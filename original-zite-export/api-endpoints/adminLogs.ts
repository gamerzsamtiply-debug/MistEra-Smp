import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin } from '../server/lib';

export default createEndpoint({
  description: 'Returns read-only activity or error logs for admins',
  authenticated: true,
  inputSchema: z.object({ type: z.enum(['activity', 'error']) }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    if (input.type === 'activity') {
      const { records } = await zite.activityLogs.findAll({ sort: [{ field: 'loggedAt', direction: 'desc' }], limit: 500 });
      return { logs: records.map((l) => ({ id: l.id, a: l.action ?? '', b: l.resource ?? '', c: l.details ?? '', who: l.adminEmail ?? '', at: l.loggedAt ?? '' })) };
    }
    const { records } = await zite.errorLogs.findAll({ sort: [{ field: 'loggedAt', direction: 'desc' }], limit: 500 });
    return { logs: records.map((l) => ({ id: l.id, a: l.operation ?? '', b: l.category ?? '', c: l.message ?? '', who: l.correlationId ?? '', at: l.loggedAt ?? '' })) };
  },
});

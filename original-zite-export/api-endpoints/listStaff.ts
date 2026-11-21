import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { profileMap } from '../server/lib';

export default createEndpoint({
  description: 'Lists staff members grouped by role',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const pm = await profileMap();
    const roles = ['Owner', 'Admin', 'Moderator', 'Staff'];
    return { staff: [...pm.values()].filter((p) => roles.includes(p.role)) };
  },
});

import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { buildStaffList } from '../lib.js';

// Public team list (no account needed to be listed)
export default publicEndpoint(z.object({}), async () => {
  const staff = await buildStaffList();
  return { staff: staff.map(({ id, name, avatarUrl, position, profileId }) => ({ id, name, avatarUrl, position, profileId })) };
});

import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { getSettingsRow, requireAdmin, settingsOut } from '../lib.js';

// Returns all site settings for admins
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const s = await getSettingsRow();
  return { ...settingsOut(s), serverPort: s.server_port ?? 19132 };
});

import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { requireAdmin, getSettings } from '../server/lib';

export default createEndpoint({
  description: 'Returns all site settings for admins',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    await requireAdmin(context);
    const s = await getSettings();
    return {
      serverAddress: s.serverAddress ?? '', serverPort: s.serverPort ?? 19132, platform: s.platform ?? '', serverStatus: s.serverStatus ?? 'Online',
      discordUrl: s.discordUrl ?? '', voteUrl: s.voteUrl ?? '', ticketUrl: s.ticketUrl ?? '', heroTagline: s.heroTagline ?? '', introText: s.introText ?? '',
      maintenanceMode: !!s.maintenanceMode, maintenanceMessage: s.maintenanceMessage ?? '',
      heroImage: s.heroImage ?? '', galleryImageOne: s.galleryImageOne ?? '', galleryImageTwo: s.galleryImageTwo ?? '', bannerImage: s.bannerImage ?? '',
    };
  },
});

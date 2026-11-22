import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { getSettings } from '../server/lib';

export default createEndpoint({
  description: 'Returns public server settings and the enabled How to Join steps',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const s = await getSettings();
    const { records } = await zite.joinSteps.findAll({ limit: 20 });
    const steps = records
      .filter((r) => r.slot === 1 || (r.enabled && (r.title ?? '').trim() && (r.instructions ?? '').trim()))
      .sort((a, b) => (a.slot === 1 ? -1 : b.slot === 1 ? 1 : (a.sortOrder ?? 9) - (b.sortOrder ?? 9)))
      .map((r) => ({ id: r.id, title: r.title ?? '', instructions: r.instructions ?? '', imageUrl: r.imageUrl ?? '' }));
    return {
      settings: {
        serverAddress: s.serverAddress ?? '', serverPort: s.serverPort ?? null, platform: s.platform ?? '',
        serverStatus: s.serverStatus ?? 'Online', discordUrl: s.discordUrl ?? '', voteUrl: s.voteUrl ?? '',
        ticketUrl: s.ticketUrl ?? '', heroTagline: s.heroTagline ?? '', introText: s.introText ?? '',
        maintenanceMode: !!s.maintenanceMode, maintenanceMessage: s.maintenanceMessage ?? '',
      heroImage: s.heroImage ?? '', galleryImageOne: s.galleryImageOne ?? '', galleryImageTwo: s.galleryImageTwo ?? '', bannerImage: s.bannerImage ?? '',
      },
      steps,
    };
  },
});

import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, getSettings, cleanUrl, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Saves server, link, homepage, help and maintenance settings',
  authenticated: true,
  inputSchema: z.object({
    serverAddress: z.string(), serverPort: z.number(), platform: z.string(), serverStatus: z.enum(['Online', 'Offline', 'Restarting']),
    discordUrl: z.string(), voteUrl: z.string(), ticketUrl: z.string(), heroTagline: z.string(), introText: z.string(),
    maintenanceMode: z.boolean(), maintenanceMessage: z.string(),
    heroImage: z.string().optional(), galleryImageOne: z.string().optional(), galleryImageTwo: z.string().optional(), bannerImage: z.string().optional(),
  }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    if (!input.serverAddress.trim() || /\s/.test(input.serverAddress.trim())) throw fail('BAD_REQUEST', 'Please enter a valid server address without spaces.');
    if (!Number.isInteger(input.serverPort) || input.serverPort < 1 || input.serverPort > 65535) throw fail('BAD_REQUEST', 'Port must be a whole number between 1 and 65535.');
    const s = await getSettings();
    const next = {
      serverAddress: input.serverAddress.trim(), serverPort: input.serverPort, platform: input.platform.trim(), serverStatus: input.serverStatus,
      discordUrl: cleanUrl(input.discordUrl), voteUrl: cleanUrl(input.voteUrl), ticketUrl: cleanUrl(input.ticketUrl),
      heroTagline: input.heroTagline.trim(), introText: input.introText.trim(), maintenanceMode: input.maintenanceMode, maintenanceMessage: input.maintenanceMessage.trim(),
      heroImage: (input.heroImage ?? '').trim(), galleryImageOne: (input.galleryImageOne ?? '').trim(), galleryImageTwo: (input.galleryImageTwo ?? '').trim(), bannerImage: (input.bannerImage ?? '').trim(),
    };
    await zite.siteSettings.update({ id: s.id, record: next });
    const labels: Record<string, string> = { serverAddress: 'Server IP', serverPort: 'Server Port', platform: 'Platform', serverStatus: 'Server status', discordUrl: 'Discord link', voteUrl: 'Voting link', ticketUrl: 'Help ticket link', heroTagline: 'Homepage tagline', introText: 'Homepage intro', maintenanceMode: 'Maintenance mode', maintenanceMessage: 'Maintenance message', heroImage: 'Hero image', galleryImageOne: 'Gallery image 1', galleryImageTwo: 'Gallery image 2', bannerImage: 'Join banner image' };
    const changed = (Object.keys(next) as (keyof typeof next)[]).filter((k) => String((s as Record<string, unknown>)[k] ?? '') !== String(next[k] ?? ''));
    for (const k of changed) await logActivity(context, `Changed ${labels[k]}`, 'Server Settings', `${String((s as Record<string, unknown>)[k] ?? '—')} → ${String(next[k] ?? '—')}`);
    return { ok: true, changed: changed.length };
  },
});

import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isMissingRelation } from '../db.js';
import { fail } from '../errors.js';
import { cleanUrl, getSettingsRow, logActivity, requireAdmin, settingsOut } from '../lib.js';

// Saves server, link, homepage, help and maintenance settings
export default authEndpoint(
  z.object({
    serverAddress: z.string().max(255),
    serverPort: z.number(),
    platform: z.string().max(200),
    serverStatus: z.enum(['Online', 'Offline', 'Restarting']),
    discordUrl: z.string().max(4096),
    voteUrl: z.string().max(4096),
    ticketUrl: z.string().max(4096),
    heroTagline: z.string().max(500),
    introText: z.string().max(5000),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().max(2000),
    heroImage: z.string().max(4096).optional(),
    galleryImageOne: z.string().max(4096).optional(),
    galleryImageTwo: z.string().max(4096).optional(),
    bannerImage: z.string().max(4096).optional(),
    heroTitle: z.string().max(200).optional(),
    aboutHeading: z.string().max(200).optional(),
    aboutText: z.string().max(5000).optional(),
    aboutTagline: z.string().max(300).optional(),
    seoDescription: z.string().max(300).optional(),
  }),
  async ({ input, user }) => {
    await requireAdmin(user);
    if (!input.serverAddress.trim() || /\s/.test(input.serverAddress.trim())) throw fail('BAD_REQUEST', 'Please enter a valid server address without spaces.');
    if (!Number.isInteger(input.serverPort) || input.serverPort < 1 || input.serverPort > 65535) throw fail('BAD_REQUEST', 'Port must be a whole number between 1 and 65535.');
    const s = await getSettingsRow();
    const next = {
      serverAddress: input.serverAddress.trim(),
      serverPort: input.serverPort,
      platform: input.platform.trim(),
      serverStatus: input.serverStatus,
      discordUrl: cleanUrl(input.discordUrl),
      voteUrl: cleanUrl(input.voteUrl),
      ticketUrl: cleanUrl(input.ticketUrl),
      heroTagline: input.heroTagline.trim(),
      introText: input.introText.trim(),
      maintenanceMode: input.maintenanceMode,
      maintenanceMessage: input.maintenanceMessage.trim(),
      heroImage: cleanUrl(input.heroImage),
      galleryImageOne: cleanUrl(input.galleryImageOne),
      galleryImageTwo: cleanUrl(input.galleryImageTwo),
      bannerImage: cleanUrl(input.bannerImage),
      heroTitle: (input.heroTitle ?? '').trim(),
      aboutHeading: (input.aboutHeading ?? '').trim(),
      aboutText: (input.aboutText ?? '').trim(),
      aboutTagline: (input.aboutTagline ?? '').trim(),
      seoDescription: (input.seoDescription ?? '').trim(),
    };
    const core = {
      server_address: next.serverAddress,
      server_port: next.serverPort,
      platform: next.platform,
      server_status: next.serverStatus,
      discord_url: next.discordUrl,
      vote_url: next.voteUrl,
      ticket_url: next.ticketUrl,
      hero_tagline: next.heroTagline,
      intro_text: next.introText,
      maintenance_mode: next.maintenanceMode,
      maintenance_message: next.maintenanceMessage,
      hero_image: next.heroImage,
      gallery_image_one: next.galleryImageOne,
      gallery_image_two: next.galleryImageTwo,
      banner_image: next.bannerImage,
    };
    const extra = {
      hero_title: next.heroTitle,
      about_heading: next.aboutHeading,
      about_text: next.aboutText,
      about_tagline: next.aboutTagline,
      seo_description: next.seoDescription,
    };
    // Try everything at once. If migration 0006 has not been run, the new columns do not exist: still save the rest
    // (so "Save settings" never breaks) and tell the admin to run the migration.
    let needsMigration = false;
    const first = await db().from('site_settings').update({ ...core, ...extra }).eq('id', s.id);
    if (first.error && isMissingRelation(first.error)) {
      console.error('[db] site_settings.update (new columns missing, run migration 0006):', first.error);
      needsMigration = true;
      must(await db().from('site_settings').update(core).eq('id', s.id), 'site_settings.update');
    } else {
      must(first, 'site_settings.update');
    }
    const labels: Record<string, string> = {
      serverAddress: 'Server IP', serverPort: 'Server Port', platform: 'Platform', serverStatus: 'Server status',
      discordUrl: 'Discord link', voteUrl: 'Voting link', ticketUrl: 'Help ticket link', heroTagline: 'Homepage tagline',
      introText: 'Homepage intro', maintenanceMode: 'Maintenance mode', maintenanceMessage: 'Maintenance message',
      heroImage: 'Hero image', galleryImageOne: 'Gallery image 1', galleryImageTwo: 'Gallery image 2', bannerImage: 'Join banner image',
      heroTitle: 'Hero title', aboutHeading: 'About heading', aboutText: 'About text', aboutTagline: 'About tagline', seoDescription: 'SEO description',
    };
    const before = settingsOut(s) as Record<string, unknown>;
    const after = next as Record<string, unknown>;
    const changed = Object.keys(next).filter((k) => String(before[k] ?? '') !== String(after[k] ?? ''));
    for (const k of changed) await logActivity(user, `Changed ${labels[k]}`, 'Server Settings', `${String(before[k] ?? '—')} → ${String(after[k] ?? '—')}`);
    return { ok: true, changed: changed.length, needsMigration };
  },
);

import { db, must, isUniqueViolation, isUuid, selectAll } from './db.js';
import { ownerEmail, ownerUserId, supabaseUrl } from './env.js';
import { ApiError, fail } from './errors.js';
import type { AuthUser } from './auth.js';
import type { ProfileRow, PublicUser, SettingsRow, Role } from './types.js';

export const STAFF_ROLES: Role[] = ['Owner', 'Admin', 'Moderator', 'Staff'];

/** The Owner role is only ever given to the configured owner email, and only once it is verified. */
export function isOwnerUser(u: AuthUser): boolean {
  if (!u.emailVerified || u.email.trim().toLowerCase() !== ownerEmail()) return false;
  const pinned = ownerUserId(); // optional extra lock: the exact auth user id
  return !pinned || u.id.toLowerCase() === pinned;
}

async function findProfileByUser(userId: string): Promise<ProfileRow | null> {
  const r = await db().from('profiles').select('*').eq('user_id', userId).maybeSingle();
  return must(r, 'profiles.findByUser') as ProfileRow | null;
}

export async function findProfileById(id: string): Promise<ProfileRow | null> {
  if (!isUuid(id)) return null;
  const r = await db().from('profiles').select('*').eq('id', id).maybeSingle();
  return must(r, 'profiles.findById') as ProfileRow | null;
}

function baseUsername(u: AuthUser): string {
  const raw = u.firstName || u.email.split('@')[0] || 'player';
  return raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'player';
}

async function createProfile(u: AuthUser, owner: boolean): Promise<ProfileRow> {
  const base = baseUsername(u);
  for (let i = 0; i < 8; i++) {
    const suffix = i === 0 ? '' : String(Math.floor(100 + Math.random() * 900));
    const username = (base.slice(0, 20 - suffix.length) + suffix).padEnd(3, '_');
    const r = await db()
      .from('profiles')
      .insert({ user_id: u.id, username, role: owner ? 'Owner' : 'Member', bio: '' })
      .select('*')
      .single();
    if (!r.error) return r.data as ProfileRow;
    if (isUniqueViolation(r.error)) {
      // Either a concurrent request already created this user's profile, or the username is taken.
      const existing = await findProfileByUser(u.id);
      if (existing) return existing;
      continue;
    }
    must(r, 'profiles.create');
  }
  throw fail('CONFLICT', 'Could not pick a free username. Please try again.');
}

/**
 * Ensures the signed-in user has a profile row. The Owner role is assigned only to the
 * verified owner email, and removed from anyone else — it can never be escalated to.
 */
export async function ensureProfile(u: AuthUser): Promise<ProfileRow> {
  const owner = isOwnerUser(u);
  let p = await findProfileByUser(u.id);
  if (!p) return createProfile(u, owner);
  if (owner && p.role !== 'Owner') {
    must(await db().from('profiles').update({ role: 'Owner' }).eq('id', p.id), 'profiles.promoteOwner');
    p = { ...p, role: 'Owner' };
  } else if (!owner && p.role === 'Owner') {
    must(await db().from('profiles').update({ role: 'Member' }).eq('id', p.id), 'profiles.demoteOwner');
    p = { ...p, role: 'Member' };
  }
  return p;
}

export async function requireAdmin(u: AuthUser): Promise<ProfileRow> {
  const p = await ensureProfile(u);
  if (p.role !== 'Owner' && p.role !== 'Admin') throw fail('FORBIDDEN', "You don't have permission to access the Admin Panel.");
  return p;
}

/**
 * Writes the admin audit trail. The action itself has already succeeded when this runs, so a logging
 * failure is reported on the server console but never turns a successful change into an error response.
 */
export async function logActivity(u: AuthUser, action: string, resource: string, details = ''): Promise<void> {
  try {
    const r = await db().from('activity_logs').insert({ action: action.slice(0, 300), resource: resource.slice(0, 500), details: details.slice(0, 2000), admin_email: u.email });
    if (r.error) console.error('[db] activity_logs.insert:', r.error);
  } catch (e) {
    console.error('[db] activity_logs.insert threw:', e);
  }
}

export const toPublicUser = (p: ProfileRow): PublicUser => ({ id: p.id, username: p.username ?? 'player', avatarUrl: p.avatar_url ?? '', role: p.role ?? 'Member' });

/** Maps auth user id → public profile info for the given users (or every profile when no ids are given). */
export async function profileMap(userIds?: (string | null)[]): Promise<Map<string, PublicUser>> {
  const m = new Map<string, PublicUser>();
  let rows: ProfileRow[];
  if (userIds) {
    const ids = [...new Set(userIds.filter((x): x is string => !!x))];
    rows = [];
    for (let i = 0; i < ids.length; i += 200) {
      const r = await db().from('profiles').select('*').in('user_id', ids.slice(i, i + 200));
      rows.push(...((must(r, 'profiles.byUsers') ?? []) as ProfileRow[]));
    }
  } else {
    rows = await selectAll<ProfileRow>((from, to) => db().from('profiles').select('*').order('joined_at', { ascending: true }).range(from, to), 2000, 'profiles.all');
  }
  for (const p of rows) m.set(p.user_id, toPublicUser(p));
  return m;
}

export const MAX_URL_LENGTH = 2048;

export function cleanUrl(v?: string): string {
  const s = (v ?? '').trim();
  if (!s) return '';
  if (s.length > MAX_URL_LENGTH || !/^https?:\/\/[^\s]+$/i.test(s)) throw fail('BAD_REQUEST', 'Please enter a valid link starting with http:// or https://');
  try {
    new URL(s);
  } catch {
    throw fail('BAD_REQUEST', 'Please enter a valid link starting with http:// or https://');
  }
  return s;
}

/**
 * Images that ordinary members submit (avatars, album photos) must be files uploaded through our own
 * Supabase Storage bucket — members cannot point the site at arbitrary third-party URLs (tracking pixels,
 * hotlinked or later-swapped content). Admin-entered images (posts, partners, settings) stay free-form.
 * `allowUnchanged` lets a user keep an avatar URL they already have.
 */
export function cleanUploadedImageUrl(v: string | undefined, allowUnchanged?: string | null): string {
  const s = cleanUrl(v);
  if (!s) return '';
  if (allowUnchanged && s === allowUnchanged) return s;
  const base = supabaseUrl();
  if (!base || !s.startsWith(`${base}/storage/v1/object/public/uploads/`)) {
    throw fail('BAD_REQUEST', 'Please upload your image with the upload button instead of pasting a link.');
  }
  return s;
}

export async function getSettingsRow(): Promise<SettingsRow> {
  const r = await db().from('site_settings').select('*').eq('key', 'main').maybeSingle();
  const existing = must(r, 'site_settings.get') as SettingsRow | null;
  if (existing) return existing;
  const created = await db()
    .from('site_settings')
    .insert({ key: 'main', server_status: 'Online', platform: 'Minecraft Bedrock Edition', maintenance_mode: false })
    .select('*')
    .single();
  if (created.error && isUniqueViolation(created.error)) {
    return must(await db().from('site_settings').select('*').eq('key', 'main').single(), 'site_settings.refetch') as SettingsRow;
  }
  return must(created, 'site_settings.create') as SettingsRow;
}

/** Camel-case settings as the frontend expects them (same keys as the original Zite columns). */
export function settingsOut(s: SettingsRow) {
  return {
    serverAddress: s.server_address ?? '',
    serverPort: s.server_port,
    platform: s.platform ?? '',
    serverStatus: s.server_status ?? 'Online',
    discordUrl: s.discord_url ?? '',
    voteUrl: s.vote_url ?? '',
    ticketUrl: s.ticket_url ?? '',
    heroTagline: s.hero_tagline ?? '',
    introText: s.intro_text ?? '',
    maintenanceMode: !!s.maintenance_mode,
    maintenanceMessage: s.maintenance_message ?? '',
    heroImage: s.hero_image ?? '',
    galleryImageOne: s.gallery_image_one ?? '',
    galleryImageTwo: s.gallery_image_two ?? '',
    bannerImage: s.banner_image ?? '',
  };
}

/** Finds one row by primary key. Non-UUID ids simply "don't exist" (instead of a Postgres cast error). */
export async function findRow<T>(table: string, id: string): Promise<T | null> {
  if (!isUuid(id)) return null;
  const r = await db().from(table).select('*').eq('id', id).maybeSingle();
  return must(r, `${table}.findById`) as T | null;
}

/** Exact row count with an optional filter. */
export async function countRows(table: string, apply?: (q: any) => any): Promise<number> {
  let q: any = db().from(table).select('*', { count: 'exact', head: true });
  if (apply) q = apply(q);
  const r = await q;
  if (r.error) {
    console.error(`[db] ${table}.count:`, r.error);
    throw new ApiError('INTERNAL', 'Database error');
  }
  return (r.count as number | null) ?? 0;
}

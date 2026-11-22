import { createHmac, randomBytes } from 'node:crypto';
import { db, must, mustOr, isUniqueViolation, isUuid, selectAll } from './db.js';
import { env, ownerEmail, ownerUserId, supabaseUrl } from './env.js';
import { ApiError, fail } from './errors.js';
import type { AuthUser } from './auth.js';
import type { ProfileRow, PublicUser, SettingsRow, Role, StaffRow, StaffPosition } from './types.js';

export const STAFF_ROLES: Role[] = ['Owner', 'Admin', 'Moderator', 'Staff'];
export const STAFF_POSITIONS: StaffPosition[] = ['Owner', 'Admin', 'Moderator', 'Developer', 'Builder', 'Helper', 'Staff'];

/**
 * The site-owner account (OWNER_EMAIL) keeps the internal "Owner" access role (full control) but is always shown as
 * "Admin". Any OTHER account that was given the Owner role (Users & Roles) is shown as "Owner".
 */
export const displayRole = (role: Role | null | undefined, isSiteOwner = false): Role => (role === 'Owner' && isSiteOwner ? 'Admin' : role ?? 'Member');

let ownerCache: { id: string | null; at: number } | null = null;
/** Auth user id of the real site-owner account (OWNER_USER_ID, else the Owner-role profile whose login e-mail is OWNER_EMAIL). Cached 5 min. */
export async function siteOwnerUserId(): Promise<string | null> {
  const pinned = ownerUserId();
  if (pinned) return pinned;
  if (ownerCache && Date.now() - ownerCache.at < 300_000) return ownerCache.id;
  let id: string | null = null;
  try {
    const r = await db().from('profiles').select('user_id').eq('role', 'Owner').limit(10);
    for (const row of ((r.data ?? []) as { user_id: string }[])) {
      const { data } = await db().auth.admin.getUserById(row.user_id);
      if (data?.user?.email?.trim().toLowerCase() === ownerEmail()) { id = row.user_id.toLowerCase(); break; }
    }
  } catch (e) {
    console.error('[owner] lookup failed:', e);
  }
  ownerCache = { id, at: Date.now() };
  return id;
}
export const isSiteOwnerId = (userId: string | null | undefined, ownerId: string | null) => !!userId && !!ownerId && userId.toLowerCase() === ownerId.toLowerCase();

/**
 * Only the configured owner account can hold the internal Owner role.
 * Because sign-up needs no e-mail confirmation, an e-mail address alone proves nothing, so one of these must hold:
 *  - OWNER_USER_ID is set and matches this exact account (strongest, recommended), or
 *  - the account is linked to Google (Google has verified the address), or
 *  - the account already held the Owner role before (existing deployments keep working).
 */
export function isOwnerUser(u: AuthUser, existingRole?: Role | null): boolean {
  if (u.email.trim().toLowerCase() !== ownerEmail()) return false;
  const pinned = ownerUserId();
  if (pinned) return u.id.toLowerCase() === pinned;
  return u.providers.includes('google') || existingRole === 'Owner';
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
 * Ensures the signed-in user has a profile row. The verified owner account always holds Owner; look-alike accounts
 * are demoted. Other accounts can only hold Owner if the real owner granted it (adminSetRole).
 */
export async function ensureProfile(u: AuthUser): Promise<ProfileRow> {
  let p = await findProfileByUser(u.id);
  const owner = isOwnerUser(u, p?.role);
  if (!p) return createProfile(u, owner);
  if (owner && p.role !== 'Owner') {
    must(await db().from('profiles').update({ role: 'Owner' }).eq('id', p.id), 'profiles.promoteOwner');
    p = { ...p, role: 'Owner' };
  } else if (!owner && p.role === 'Owner' && u.email.trim().toLowerCase() === ownerEmail()) {
    // Someone using the owner's e-mail address without being the real owner account is always demoted.
    // (An Owner role held by an account with a DIFFERENT e-mail was granted by the site owner in Users & Roles and stays.)
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

/** Moderators, Admins and the Owner can review the community album. Everything else in the Admin Panel stays Admin-only. */
export async function requireModerator(u: AuthUser): Promise<ProfileRow> {
  const p = await ensureProfile(u);
  if (p.role !== 'Owner' && p.role !== 'Admin' && p.role !== 'Moderator') throw fail('FORBIDDEN', "You don't have permission to review the album.");
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

export const toPublicUser = (p: ProfileRow, ownerId: string | null = null): PublicUser => ({ id: p.id, username: p.username ?? 'player', avatarUrl: p.avatar_url ?? '', role: displayRole(p.role, isSiteOwnerId(p.user_id, ownerId)) });

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
  const ownerId = await siteOwnerUserId();
  for (const p of rows) m.set(p.user_id, toPublicUser(p, ownerId));
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

const VIDEO_EXT = /\.(mp4|webm|mov)$/i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/** Like cleanUploadedImageUrl, but for album posts that can be a photo or a video; the file type must match. */
export function cleanUploadedMediaUrl(v: string | undefined, kind: 'image' | 'video'): string {
  const s = cleanUploadedImageUrl(v);
  if (!s) return '';
  if (!(kind === 'video' ? VIDEO_EXT : IMAGE_EXT).test(s.split('?')[0])) throw fail('BAD_REQUEST', 'The uploaded file does not match its type. Please upload it again.');
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
    heroTitle: s.hero_title ?? '',
    aboutHeading: s.about_heading ?? '',
    aboutText: s.about_text ?? '',
    aboutTagline: s.about_tagline ?? '',
    seoDescription: s.seo_description ?? '',
  };
}

/** Editable content pages (Admin > Pages). The same list is enforced by the content_pages_slug_check constraint (migration 0006). */
export const PAGE_SLUGS = ['information', 'about', 'rules', 'terms', 'privacy'] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];
export const PAGE_TITLES: Record<PageSlug, string> = {
  information: 'Server Information', about: 'About Us', rules: 'Server Rules', terms: 'Terms of Service', privacy: 'Privacy Policy',
};

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

// ───────────── Staff (public team list) ─────────────

export interface StaffOut {
  id: string;
  name: string;
  avatarUrl: string;
  position: StaffPosition;
  /** Linked registered account (public profile id), if the staff member linked one. */
  profileId: string | null;
  username: string | null;
  /** True for the automatic entry of the OWNER_EMAIL account (shown as Admin, not editable). */
  system: boolean;
}

const positionRank = (p: string) => {
  const i = STAFF_POSITIONS.indexOf(p as StaffPosition);
  return i < 0 ? 99 : i;
};

/**
 * The public team: every staff entry added by admins (no account needed) plus the OWNER_EMAIL account,
 * which appears as "Admin" unless it was given a position in Admin > Staff. Missing table (migration not applied) degrades to just the owner entry.
 */
export async function buildStaffList(): Promise<StaffOut[]> {
  const [sr, pr] = await Promise.all([
    db().from('staff_members').select('id,name,avatar_url,position,profile_id,created_at').order('created_at', { ascending: true }).limit(500),
    db().from('profiles').select('*').eq('role', 'Owner').limit(10),
  ]);
  const rows = mustOr(sr, 'staff_members.list', [] as StaffRow[]) as StaffRow[];
  const owners = mustOr(pr, 'profiles.owners', [] as ProfileRow[]) as ProfileRow[];
  const ownerId = await siteOwnerUserId();

  const linkedIds = [...new Set(rows.map((r) => r.profile_id).filter((x): x is string => !!x))];
  const linked = new Map<string, ProfileRow>();
  for (let i = 0; i < linkedIds.length; i += 200) {
    const r = await db().from('profiles').select('*').in('id', linkedIds.slice(i, i + 200));
    for (const p of mustOr(r, 'profiles.linkedStaff', [] as ProfileRow[]) as ProfileRow[]) linked.set(p.id, p);
  }

  const out: StaffOut[] = rows.map((r) => {
    const p = r.profile_id ? linked.get(r.profile_id) : undefined;
    return {
      id: r.id,
      name: r.name ?? '',
      avatarUrl: r.avatar_url || p?.avatar_url || '',
      // The position chosen in Admin > Staff is what is shown (the site-owner account has no staff row of its own: see below).
      position: (r.position ?? 'Staff') as StaffPosition,
      profileId: p?.id ?? null,
      username: p?.username ?? null,
      system: false,
    };
  });
  for (const o of owners) {
    if (out.some((s) => s.profileId === o.id)) continue;
    out.push({ id: `owner-${o.id}`, name: o.username ?? 'Admin', avatarUrl: o.avatar_url ?? '', position: isSiteOwnerId(o.user_id, ownerId) ? 'Admin' : 'Owner', profileId: o.id, username: o.username ?? null, system: true });
  }
  return out.sort((a, b) => positionRank(a.position) - positionRank(b.position));
}

// ───────────── One-time staff link codes ─────────────
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** 16 random characters (80 bits), shown as XXXX-XXXX-XXXX-XXXX. */
export function newClaimCode(): string {
  const bytes = randomBytes(16);
  let raw = '';
  for (let i = 0; i < 16; i++) raw += B32[bytes[i] % B32.length];
  return raw.match(/.{4}/g)!.join('-');
}

export const normalizeClaimCode = (v: string): string => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function hashClaimCode(code: string): string {
  const secret = env('SUPABASE_SERVICE_ROLE_KEY') ?? 'mistera';
  return createHmac('sha256', secret).update(`staff-claim|${normalizeClaimCode(code)}`).digest('hex');
}

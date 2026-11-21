import { zite } from 'zitejs/db';
import { ZiteError, type ZiteRequestContext } from 'zitejs/backend';

export const OWNER_EMAIL = 'gamerzsamtiply@gmail.com';
export const STAFF_ROLES = ['Owner', 'Admin', 'Moderator', 'Staff'] as const;

export const uid = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export function fail(code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED', message: string) {
  return new ZiteError({ code, message, userFacingMessage: message });
}

export function isOwnerEmail(email?: string) {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}

/** Ensures the signed-in user has a profile; the owner role is assigned only from the verified owner email. */
export async function ensureProfile(context: ZiteRequestContext) {
  const u = context.user;
  if (!u) throw fail('UNAUTHORIZED', 'Please log in to continue.');
  const owner = isOwnerEmail(u.email);
  let p = await zite.profiles.findOne({ filters: { user: u.id } });
  if (!p) {
    const base = (u.firstName || u.email.split('@')[0] || 'player').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'player';
    p = await zite.profiles.create({ record: { user: u.id, username: base, role: owner ? 'Admin' : 'Member', bio: '' } });
  } else if (owner && p.role !== 'Admin') {
    await zite.profiles.update({ id: p.id, record: { role: 'Admin' } });
    p = { ...p, role: 'Admin' };
  } else if (!owner && p.role === 'Owner') {
    // Owner role can only belong to the owner email — never escalate anyone else.
    await zite.profiles.update({ id: p.id, record: { role: 'Member' } });
    p = { ...p, role: 'Member' };
  }
  return p;
}

export async function requireAdmin(context: ZiteRequestContext) {
  const p = await ensureProfile(context);
  if (p.role !== 'Owner' && p.role !== 'Admin') throw fail('FORBIDDEN', "You don't have permission to access the Admin Panel.");
  return p;
}

export async function logActivity(context: ZiteRequestContext, action: string, resource: string, details = '') {
  await zite.activityLogs.create({ record: { action, resource, details: details.slice(0, 2000), adminEmail: context.user.email } });
}

export async function profileMap() {
  const { records } = await zite.profiles.findAll({ limit: 2000 });
  const m = new Map<string, { id: string; username: string; avatarUrl: string; role: string }>();
  for (const p of records) m.set(uid(p.user), { id: p.id, username: p.username ?? 'player', avatarUrl: p.avatarUrl ?? '', role: p.role ?? 'Member' });
  return m;
}

export function cleanUrl(v?: string) {
  const s = (v ?? '').trim();
  if (!s) return '';
  if (!/^https?:\/\/[^\s]+$/i.test(s)) throw fail('BAD_REQUEST', 'Please enter a valid link starting with http:// or https://');
  return s;
}

export async function getSettings() {
  const s = await zite.siteSettings.findOne({ filters: { key: 'main' } });
  if (s) return s;
  return zite.siteSettings.create({ record: { key: 'main', serverStatus: 'Online', platform: 'Minecraft Bedrock Edition', maintenanceMode: false } });
}

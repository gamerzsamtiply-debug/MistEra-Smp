import { db } from './db.js';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
}

/**
 * Verifies a Supabase Auth access token (the "Authorization: Bearer <jwt>" header)
 * by asking Supabase Auth, so revoked/expired tokens are rejected.
 */
export async function authenticate(authorization: string | undefined): Promise<AuthUser | null> {
  const m = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  if (!m) return null;
  const { data, error } = await db().auth.getUser(m[1]);
  if (error || !data?.user) return null;
  const u = data.user;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const full = str(meta.full_name) || str(meta.name);
  return {
    id: u.id,
    email: u.email ?? '',
    emailVerified: !!u.email_confirmed_at,
    firstName: str(meta.first_name) || str(meta.given_name) || full.split(' ')[0] || '',
  };
}

import { db } from './db.js';
import { ApiError } from './errors.js';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  /** Auth providers linked to the account, e.g. ["email"] or ["email", "google"]. */
  providers: string[];
}

/**
 * Verifies a Supabase Auth access token (the "Authorization: Bearer <jwt>" header)
 * by asking Supabase Auth, so revoked/expired tokens are rejected.
 * A rejected token is a 401; an outage of the auth service is a server error (never a fake "logged out").
 */
export async function authenticate(authorization: string | undefined): Promise<AuthUser | null> {
  const m = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  if (!m) return null;
  let res: Awaited<ReturnType<ReturnType<typeof db>['auth']['getUser']>>;
  try {
    res = await db().auth.getUser(m[1]);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    console.error('[auth] getUser threw:', e);
    throw new ApiError('INTERNAL', 'Authentication service unavailable');
  }
  const { data, error } = res;
  if (error) {
    // Supabase reports a bad / expired / malformed token in several shapes (some without an HTTP status), so only a
    // genuine outage (5xx, network failure, timeout) is a server error. Everything else simply means "not logged in" (401).
    const e = error as { status?: number; name?: string; message?: string };
    const outage = (typeof e.status === 'number' && e.status >= 500) || e.name === 'AuthRetryableFetchError' || /fetch failed|network|timed? ?out|econn|enotfound|abort/i.test(e.message ?? '');
    if (!outage) return null;
    console.error('[auth] getUser failed:', error);
    throw new ApiError('INTERNAL', 'Authentication service unavailable');
  }
  if (!data?.user) return null;
  const u = data.user;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const full = str(meta.full_name) || str(meta.name);
  const app = (u.app_metadata ?? {}) as Record<string, unknown>;
  const providers = new Set<string>(Array.isArray(app.providers) ? (app.providers as unknown[]).filter((p): p is string => typeof p === 'string') : []);
  if (typeof app.provider === 'string') providers.add(app.provider);
  for (const i of u.identities ?? []) if (i?.provider) providers.add(i.provider);
  return {
    id: u.id,
    email: u.email ?? '',
    emailVerified: !!u.email_confirmed_at,
    firstName: str(meta.first_name) || str(meta.given_name) || full.split(' ')[0] || '',
    providers: [...providers],
  };
}

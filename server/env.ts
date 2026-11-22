/** Reads an environment variable, treating empty strings as unset. */
export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** The only email address that can ever hold the Owner role (and only once verified). */
export function ownerEmail(): string {
  return (env('OWNER_EMAIL') ?? 'gamerzsamtiply@gmail.com').toLowerCase();
}

/**
 * Optional hardening: the exact Supabase Auth user id of the owner. When set, the Owner role requires BOTH the
 * verified OWNER_EMAIL and this user id, so nobody can obtain Owner by registering the address first
 * (for example if "Confirm email" is ever switched off in Supabase).
 */
export function ownerUserId(): string | undefined {
  return env('OWNER_USER_ID')?.toLowerCase();
}

/** Project URL used for server-side Supabase access and to recognise our own storage URLs. */
export function supabaseUrl(): string | undefined {
  return (env('SUPABASE_URL') ?? env('VITE_SUPABASE_URL'))?.replace(/\/+$/, '');
}

import type { z } from 'zod';
import type { AuthUser } from './auth.js';

export interface RequestContext {
  /** Best-effort client IP (from the Vercel proxy headers). Used for rate limiting only. */
  ip: string;
}

export interface Endpoint {
  /** When true the request must carry a valid Supabase access token. */
  authenticated: boolean;
  /** When true a valid token is used if present (to personalise the answer), but a missing/invalid one is fine. */
  optionalAuth?: boolean;
  input: z.ZodTypeAny;
  run: (input: unknown, user: AuthUser | null, ctx: RequestContext) => Promise<unknown>;
}

/** An endpoint anyone can call (no login needed). */
export function publicEndpoint<S extends z.ZodTypeAny>(input: S, run: (a: { input: z.infer<S>; ip: string }) => Promise<unknown>): Endpoint {
  return { authenticated: false, input, run: (i, _user, ctx) => run({ input: i as z.infer<S>, ip: ctx.ip }) };
}

/** An endpoint that requires a signed-in user. Admin-only endpoints additionally call requireAdmin(user). */
export function authEndpoint<S extends z.ZodTypeAny>(input: S, run: (a: { input: z.infer<S>; user: AuthUser; ip: string }) => Promise<unknown>): Endpoint {
  return {
    authenticated: true,
    input,
    run: (i, user, ctx) => {
      if (!user) throw new Error('authEndpoint invoked without a user');
      return run({ input: i as z.infer<S>, user, ip: ctx.ip });
    },
  };
}

/** A public endpoint that also learns who is asking when a valid login token is sent (e.g. "did I like this?"). */
export function optionalAuthEndpoint<S extends z.ZodTypeAny>(input: S, run: (a: { input: z.infer<S>; user: AuthUser | null; ip: string }) => Promise<unknown>): Endpoint {
  return { authenticated: false, optionalAuth: true, input, run: (i, user, ctx) => run({ input: i as z.infer<S>, user, ip: ctx.ip }) };
}

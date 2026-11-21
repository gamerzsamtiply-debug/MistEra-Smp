import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { recordLogin } from './api';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthCtx {
  user: AuthUser | null;
  isLoading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setIsLoading(false);
      // Log each real sign-in once (kept for admins only). Deferred so we never call Supabase inside this callback.
      if (event === 'SIGNED_IN' && next?.user) {
        const stamp = `${next.user.id}:${next.user.last_sign_in_at ?? ''}`;
        let seen = '';
        try { seen = localStorage.getItem('mistera-login-rec') ?? ''; } catch { /* storage unavailable */ }
        if (seen !== stamp) {
          try { localStorage.setItem('mistera-login-rec', stamp); } catch { /* storage unavailable */ }
          const google = next.user.app_metadata?.provider === 'google';
          setTimeout(() => { recordLogin({ method: google ? 'google' : 'password' }).catch(() => undefined); }, 0);
        }
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const uid = session?.user?.id ?? null;
  const email = session?.user?.email ?? '';
  const user = useMemo<AuthUser | null>(() => (uid ? { id: uid, email } : null), [uid, email]);
  const value = useMemo(() => ({ user, isLoading }), [user, isLoading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Same shape the original Zite hook had: { user, isLoading }. */
export function useAuth(): AuthCtx {
  return useContext(Ctx);
}

/** Only same-site paths are allowed as a post-login destination (prevents open redirects). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

/** Sends the visitor to the login page and brings them back to the current page afterwards. */
export function loginWithRedirect(): void {
  const here = window.location.pathname + window.location.search;
  const next = here.startsWith('/login') || here.startsWith('/reset-password') ? '/' : here;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  window.location.assign('/');
}

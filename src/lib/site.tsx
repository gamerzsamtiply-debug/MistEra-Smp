import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { getSite, getMe, type GetSiteOutputType } from '@/lib/api';
import { run, isAppError, type AppError } from './errors';

export type Settings = GetSiteOutputType['settings'];
export type Step = GetSiteOutputType['steps'][0];
export interface Me { profile: { id: string; username: string; bio: string; avatarUrl: string; role: string }; isOwner: boolean; isAdmin: boolean }

interface SiteCtx { settings: Settings | null; steps: Step[]; me: Me | null; meLoading: boolean; error: AppError | null; reload: () => void; reloadMe: () => void }
const Ctx = createContext<SiteCtx | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [site, setSite] = useState<GetSiteOutputType | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  const reload = useCallback(() => {
    setError(null);
    run('Load site', () => getSite({}), { retries: 2, silent: true }).then((d) => d && setSite(d)).catch((e) => setError(isAppError(e) ? e : null));
  }, []);
  const reloadMe = useCallback(() => {
    if (!user) { setMe(null); setMeLoading(false); return; }
    setMeLoading(true);
    run('Load profile', () => getMe({}), { retries: 1, silent: true }).then((d) => setMe((d as Me) ?? null)).catch(() => setMe(null)).finally(() => setMeLoading(false));
  }, [user]);

  useEffect(reload, [reload]);
  useEffect(() => { if (!isLoading) reloadMe(); }, [isLoading, reloadMe]);

  return <Ctx.Provider value={{ settings: site?.settings ?? null, steps: site?.steps ?? [], me, meLoading: isLoading || meLoading, error, reload, reloadMe }}>{children}</Ctx.Provider>;
}

export function useSite() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSite outside provider');
  return c;
}

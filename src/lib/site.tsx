import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { getSite, getMe, type GetSiteOutputType } from '@/lib/api';
import { run, isAppError, type AppError } from './errors';

export type Settings = GetSiteOutputType['settings'];
export type Step = GetSiteOutputType['steps'][0];
export interface Me { profile: { id: string; username: string; bio: string; avatarUrl: string; role: string }; staffPosition: string | null; isOwner: boolean; isAdmin: boolean }

interface SiteCtx { settings: Settings | null; steps: Step[]; me: Me | null; meLoading: boolean; error: AppError | null; reload: () => void; reloadMe: () => void }
const Ctx = createContext<SiteCtx | null>(null);

// The last known site settings are kept so a return visit paints immediately; they are refreshed in the background.
const CACHE_KEY = 'mistera-site-v2';
function readCache(): GetSiteOutputType | null {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    const d = v ? (JSON.parse(v) as GetSiteOutputType) : null;
    // only trust a cache that has the expected shape; anything else is dropped and re-fetched
    return d && typeof d === 'object' && d.settings && typeof d.settings === 'object' && Array.isArray(d.steps) ? d : null;
  } catch { return null; }
}
function writeCache(d: GetSiteOutputType) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [site, setSite] = useState<GetSiteOutputType | null>(readCache);
  const [error, setError] = useState<AppError | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  const reload = useCallback(() => {
    setError(null);
    run('Load site', () => getSite({}), { silent: true }).then((d) => { if (d && d.settings) { setSite({ settings: d.settings, steps: Array.isArray(d.steps) ? d.steps : [] }); writeCache(d); } }).catch((e) => setError(isAppError(e) ? e : null));
  }, []);
  const reloadMe = useCallback(() => {
    if (!user) { setMe(null); setMeLoading(false); return; }
    setMeLoading(true);
    run('Load profile', () => getMe({}), { silent: true }).then((d) => setMe((d as Me) ?? null)).catch(() => setMe(null)).finally(() => setMeLoading(false));
  }, [user]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (!isLoading) reloadMe(); }, [isLoading, reloadMe]);

  return <Ctx.Provider value={{ settings: site?.settings ?? null, steps: site?.steps ?? [], me, meLoading: isLoading || meLoading, error, reload, reloadMe }}>{children}</Ctx.Provider>;
}

export function useSite() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSite outside provider');
  return c;
}

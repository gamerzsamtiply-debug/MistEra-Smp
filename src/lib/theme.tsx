import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'mistera-theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#1D1D1D', light: '#f5f5f7' };

function readTheme(): Theme {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } // dark is the default
}

function apply(theme: Theme) {
  const el = document.documentElement;
  el.classList.toggle('dark', theme === 'dark');
  el.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void }
const Ctx = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  useEffect(() => { apply(theme); }, [theme]);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch { /* storage unavailable */ }
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteTheme(): ThemeCtx {
  return useContext(Ctx);
}

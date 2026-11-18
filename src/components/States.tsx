import { useEffect, useState } from 'react';
import { Loader2, type LucideIcon, AlertTriangle, RefreshCw, WifiOff, Lock, ShieldX, SearchX } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { loginWithRedirect } from '@/lib/auth';
import type { AppError } from '../lib/errors';

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />{label}</div>;
}

/** Spinner that only appears if loading takes longer than a moment, so quick page changes never flash. */
export function DelayedSpinner({ delay = 300 }: { delay?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return show ? <Spinner /> : null;
}

export function GridSkeleton({ count = 6, className = 'h-56' }: { count?: number; className?: string }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={`${className} rounded-xl`} />)}</div>;
}

export function EmptyState({ icon: Icon, title, message }: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary"><Icon className="h-6 w-6 text-primary" /></div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

const ICONS: Record<string, LucideIcon> = { network: WifiOff, timeout: RefreshCw, unauthorized: Lock, forbidden: ShieldX, notFound: SearchX };

export function InlineError({ error, onRetry }: { error: AppError; onRetry?: () => void }) {
  const Icon = ICONS[error.kind] ?? AlertTriangle;
  return (
    <div className="flex flex-col items-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center" role="alert">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15"><Icon className="h-6 w-6 text-destructive" /></div>
      <h3 className="text-lg font-semibold">{error.title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message}</p>
      <div className="mt-5 flex gap-2">
        {error.kind === 'unauthorized' && <Button onClick={() => loginWithRedirect()}>Log in</Button>}
        {onRetry && error.kind !== 'forbidden' && <Button variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>}
      </div>
      <p className="mt-4 font-mono text-[11px] text-muted-foreground/70">Reference: {error.correlationId}</p>
    </div>
  );
}

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@project/components/lib/utils';

/** Tap-to-copy field used for the server IP and port. Label on top, value below, copy icon on the right. */
export default function CopyField({ label, value, className }: { label: string; value: string; className?: string }) {
  const [done, setDone] = useState(false);
  const empty = !value;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(`${label} copied`);
      setTimeout(() => setDone(false), 1600);
    } catch {
      toast.error("Couldn't copy", { description: 'Please select and copy it manually.' });
    }
  };
  return (
    <button
      type="button"
      disabled={empty}
      onClick={copy}
      aria-label={empty ? `${label} not set yet` : `Copy ${label}`}
      className={cn('group flex h-14 w-full items-center gap-3 rounded-lg border border-border bg-card px-4 text-left transition-colors hover:border-primary disabled:cursor-default disabled:hover:border-border', className)}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs leading-4 text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-medium leading-5 text-foreground tabular-nums">{empty ? 'Not set yet' : value}</span>
      </span>
      {!empty && (
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground', done ? 'text-emerald-500' : 'text-primary')}>
          {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </span>
      )}
    </button>
  );
}

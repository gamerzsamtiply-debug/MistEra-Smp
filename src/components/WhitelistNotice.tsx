import { ShieldAlert } from 'lucide-react';
import { WHITELIST_NOTICE } from '../lib/brand';

export default function WhitelistNotice({ compact }: { compact?: boolean }) {
  return (
    <div role="note" className={`flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 ${compact ? 'p-3' : 'p-4 md:p-5'}`}>
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className={`font-medium leading-relaxed text-foreground/90 ${compact ? 'text-xs' : 'text-sm'}`}>{WHITELIST_NOTICE}</p>
    </div>
  );
}

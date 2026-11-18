import { ShieldAlert } from 'lucide-react';
import { WHITELIST_NOTICE } from '../lib/brand';

export default function WhitelistNotice({ compact }: { compact?: boolean }) {
  return (
    <div role="note" className={`flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 ${compact ? 'p-3' : 'p-4 md:p-5'}`}>
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <p className={`font-semibold text-accent ${compact ? 'text-xs' : 'text-sm'}`}>{WHITELIST_NOTICE}</p>
    </div>
  );
}

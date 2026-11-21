import { useState } from 'react';
import { Copy, Check, Server } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@project/components/lib/utils';
import type { Settings } from '../lib/site';

const STATUS: Record<string, string> = { Online: 'bg-emerald-400', Offline: 'bg-red-400', Restarting: 'bg-amber-400' };

export default function ServerCard({ s }: { s: Settings }) {
  const [copied, setCopied] = useState('');
  const copy = async (label: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(label); toast.success(`${label} copied`); setTimeout(() => setCopied(''), 1500); }
    catch { toast.error("Couldn't copy", { description: 'Please select and copy it manually.' }); }
  };
  const rows: [string, string][] = [['Server IP', s.serverAddress || 'Not set yet'], ['Port', s.serverPort ? String(s.serverPort) : 'Not set yet']];
  return (
    <div className="glass rounded-2xl p-5 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold"><Server className="h-4 w-4 text-primary" />{s.platform || 'Minecraft Bedrock'}</span>
        <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
          <span className="relative flex h-2 w-2"><span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', STATUS[s.serverStatus] ?? 'bg-muted')} /><span className={cn('relative inline-flex h-2 w-2 rounded-full', STATUS[s.serverStatus] ?? 'bg-muted')} /></span>
          {s.serverStatus}
        </span>
      </div>
      <div className="space-y-2">
        {rows.map(([label, v]) => (
          <button key={label} disabled={v === 'Not set yet'} onClick={() => copy(label, v)} className="flex w-full items-center justify-between rounded-xl bg-secondary/70 px-4 py-3 text-left transition hover:bg-secondary disabled:cursor-default">
            <span><span className="block text-xs text-muted-foreground">{label}</span><span className="font-mono text-sm">{v}</span></span>
            {v !== 'Not set yet' && (copied === label ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Whitelist approval required before connecting.</p>
    </div>
  );
}

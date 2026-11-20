import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { adminListSteps, adminSaveStep } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Switch } from '@project/components/ui/switch';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import ImageUpload from '../../components/ImageUpload';
import { Spinner, InlineError } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { useSite } from '../../lib/site';
import { run } from '../../lib/errors';
import Field from './Field';

type StepT = { slot: number; title: string; instructions: string; imageUrl: string; enabled: boolean; sortOrder: number };

function StepEditor({ step, onSaved }: { step: StepT; onSaved: () => void }) {
  const [f, setF] = useState(step);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(step), [step]);
  const req = f.slot === 1;
  const save = async () => {
    if ((req || f.enabled) && (!f.title.trim() || !f.instructions.trim())) return setErr('An enabled step needs both a title and instructions.');
    setErr(''); setBusy(true);
    try { await run('Whitelist guide update', () => adminSaveStep(f), { success: `Step ${f.slot} saved`, failTitle: 'Failed to update whitelist guide' }); onSaved(); } catch { /* kept */ } finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><h3 className="text-lg font-semibold">Step slot {f.slot}</h3>{req ? <Badge><Lock className="mr-1 h-3 w-3" />Required</Badge> : <Badge variant="secondary">Optional{f.enabled ? '' : ' - hidden from visitors'}</Badge>}</div>
        {!req && <div className="flex items-center gap-4"><div className="flex items-center gap-2 text-sm">Position<Select value={String(f.sortOrder)} onValueChange={(v) => setF({ ...f, sortOrder: Number(v) })}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{[2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select></div><label className="flex items-center gap-2 text-sm">Enabled<Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} /></label></div>}
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Instructions"><Textarea rows={5} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></Field>
        </div>
        <Field label="Image (optional)"><ImageUpload value={f.imageUrl} onChange={(u) => setF({ ...f, imageUrl: u })} /></Field>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex justify-end"><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save step</Button></div>
    </div>
  );
}

export default function StepsTab() {
  const { data, error, loading, reload } = useLoad('Load whitelist guide', () => adminListSteps({}));
  const site = useSite();
  if (loading) return <Spinner />;
  if (error) return <InlineError error={error} onRetry={reload} />;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Step 1 is always shown. Optional steps 2-5 only appear publicly when enabled and filled in; visitors never see disabled or empty steps. Position controls the order of optional steps.</p>
      {(data?.steps ?? []).map((s) => <StepEditor key={s.slot} step={s} onSaved={() => { reload(); site.reload(); }} />)}
    </div>
  );
}

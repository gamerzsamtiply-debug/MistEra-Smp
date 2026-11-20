import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { adminGetSettings, adminSaveSettings, type AdminSaveSettingsInputType } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Switch } from '@project/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Spinner, InlineError } from '../../components/States';
import WhitelistNotice from '../../components/WhitelistNotice';
import { useLoad } from '../../lib/useLoad';
import { useSite } from '../../lib/site';
import { run } from '../../lib/errors';
import Field from './Field';
import ImageUpload from '../../components/ImageUpload';

const urlOk = (s: string) => !s || /^https?:\/\/\S+$/i.test(s);

export default function SettingsTab() {
  const { data, error, loading, reload } = useLoad('Load settings', () => adminGetSettings({}));
  const site = useSite();
  const [f, setF] = useState<AdminSaveSettingsInputType | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF(data as AdminSaveSettingsInputType); }, [data]);
  if (loading || (!f && !error)) return <Spinner />;
  if (error || !f) return error ? <InlineError error={error} onRetry={reload} /> : null;
  const set = (k: keyof AdminSaveSettingsInputType, v: unknown) => setF({ ...f, [k]: v } as AdminSaveSettingsInputType);
  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.serverAddress.trim() || /\s/.test(f.serverAddress.trim())) e.serverAddress = 'Enter a server address without spaces.';
    if (!Number.isInteger(f.serverPort) || f.serverPort < 1 || f.serverPort > 65535) e.serverPort = 'Port must be 1-65535.';
    (['discordUrl', 'voteUrl', 'ticketUrl'] as const).forEach((k) => { if (!urlOk(f[k])) e[k] = 'Must start with http:// or https://'; });
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    try { const r = await run('Server settings update', () => adminSaveSettings(f), { success: 'Server settings saved', failTitle: 'Failed to save server settings' }); if (r?.needsMigration) toast.warning('Saved, but hero/about/SEO text was not stored', { description: 'Run supabase/migrations/0006_site_content.sql in the Supabase SQL Editor, then save again.' }); site.reload(); } catch { /* kept */ } finally { setBusy(false); }
  };
  const sec = 'rounded-2xl border border-border bg-card p-6 space-y-5';
  return (
    <div className="space-y-6">
      <section className={sec}><h3 className="text-lg font-semibold">Server</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Server IP / Address" error={errs.serverAddress}><Input value={f.serverAddress} onChange={(e) => set('serverAddress', e.target.value)} /></Field>
          <Field label="Server Port" error={errs.serverPort}><Input type="number" value={f.serverPort} onChange={(e) => set('serverPort', Number(e.target.value))} /></Field>
          <Field label="Platform"><Input value={f.platform} onChange={(e) => set('platform', e.target.value)} /></Field>
          <Field label="Server status"><Select value={f.serverStatus} onValueChange={(v) => set('serverStatus', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Online', 'Offline', 'Restarting'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
        </div>
        <WhitelistNotice compact />
      </section>
      <section className={sec}><h3 className="text-lg font-semibold">Links & Help</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Discord invitation URL" error={errs.discordUrl}><Input value={f.discordUrl} onChange={(e) => set('discordUrl', e.target.value)} placeholder="https://discord.gg/..." /></Field>
          <Field label="Voting URL" error={errs.voteUrl}><Input value={f.voteUrl} onChange={(e) => set('voteUrl', e.target.value)} placeholder="https://..." /></Field>
          <Field label="Discord Ticket URL (Help)" error={errs.ticketUrl}><Input value={f.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} placeholder="https://discord.com/channels/..." /></Field>
        </div>
      </section>
      <section className={sec}><div><h3 className="text-lg font-semibold">Homepage hero</h3><p className="text-sm text-muted-foreground">The big heading and the description under it. Leave empty to use the default text.</p></div>
        <Field label="Hero title (main heading)"><Input value={f.heroTitle ?? ''} maxLength={200} onChange={(e) => set('heroTitle', e.target.value)} placeholder="Bangladesh's Bedrock SMP. Online 24/7." /></Field>
        <Field label="Hero description"><Textarea rows={2} value={f.heroTagline} maxLength={500} onChange={(e) => set('heroTagline', e.target.value)} /></Field>
      </section>
      <section className={sec}><div><h3 className="text-lg font-semibold">Homepage "About" section</h3><p className="text-sm text-muted-foreground">Shown below the hero. Separate paragraphs with an empty line.</p></div>
        <Field label="Heading"><Input value={f.aboutHeading ?? ''} maxLength={200} onChange={(e) => set('aboutHeading', e.target.value)} placeholder="Private by design. Built together." /></Field>
        <Field label="Text"><Textarea rows={7} value={f.aboutText ?? ''} maxLength={5000} onChange={(e) => set('aboutText', e.target.value)} /></Field>
        <Field label="Closing line (highlighted)"><Input value={f.aboutTagline ?? ''} maxLength={300} onChange={(e) => set('aboutTagline', e.target.value)} placeholder="Eras End. MistEra Never Fades." /></Field>
      </section>
      <section className={sec}><div><h3 className="text-lg font-semibold">Search & AI description</h3><p className="text-sm text-muted-foreground">Used as the homepage description for Google, Discord/Facebook previews and AI assistants. Aim for 120-160 characters. Only public website text is ever shared with them, never anything from this panel.</p></div>
        <Field label="Homepage SEO description" hint={`${(f.seoDescription ?? '').length}/160 characters`}><Textarea rows={3} value={f.seoDescription ?? ''} maxLength={300} onChange={(e) => set('seoDescription', e.target.value)} /></Field>
      </section>
      <section className={sec}><div><h3 className="text-lg font-semibold">Homepage images</h3><p className="text-sm text-muted-foreground">Upload your own MistEra screenshots. Leave empty to use the default image.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          {([['heroImage', 'Hero background'], ['galleryImageOne', 'Gallery - large image'], ['galleryImageTwo', 'Gallery - small image'], ['bannerImage', 'Join banner background']] as const).map(([k, l]) => (
            <Field key={k} label={l}><ImageUpload value={f[k] ?? ''} onChange={(u) => set(k, u)} label={`Upload ${l.toLowerCase()}`} /></Field>
          ))}
        </div>
      </section>
      <section className={sec}><h3 className="text-lg font-semibold">Maintenance mode</h3>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/50 p-4"><div><p className="font-medium">Enable maintenance mode</p><p className="text-sm text-muted-foreground">Visitors see the maintenance page. Owner and Admins can still use the site.</p></div><Switch checked={f.maintenanceMode} onCheckedChange={(v) => set('maintenanceMode', v)} /></div>
        <Field label="Maintenance message"><Textarea rows={3} value={f.maintenanceMessage} onChange={(e) => set('maintenanceMessage', e.target.value)} /></Field>
      </section>
      <div className="sticky bottom-4 flex justify-end"><Button size="lg" onClick={save} disabled={busy} className="shadow-xl">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save settings</Button></div>
    </div>
  );
}

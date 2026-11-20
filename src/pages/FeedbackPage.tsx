import { useState } from 'react';
import { Loader2, MessageSquareHeart } from 'lucide-react';
import { submitFeedback } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import PageHeader from '../components/PageHeader';
import { run } from '../lib/errors';

export default function FeedbackPage() {
  const [f, setF] = useState({ name: '', contact: '', message: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (f.message.trim().length < 5) return setErr('Please write at least 5 characters.');
    setErr(''); setBusy(true);
    try {
      await run('Feedback', () => submitFeedback(f), { failTitle: 'Could not send feedback' });
      setSent(true); setF({ name: '', contact: '', message: '' });
    } catch { /* error toast already shown; the text is kept so nothing is lost */ } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader eyebrow="Feedback" title="Tell us what you think" subtitle="Ideas, problems or kind words: staff read every message. No account needed." />
      <section className="wrap sect">
        <div className="glass mx-auto max-w-xl space-y-4 p-6">
          {sent ? (
            <div className="space-y-3 py-6 text-center">
              <MessageSquareHeart className="mx-auto h-10 w-10 text-primary" />
              <h2 className="text-xl font-semibold">Thank you!</h2>
              <p className="text-sm text-muted-foreground">Your feedback was sent to the staff team.</p>
              <Button variant="outline" onClick={() => setSent(false)}>Send another</Button>
            </div>
          ) : (<>
            <div className="space-y-1.5"><Label htmlFor="fb-name">Name (optional)</Label><Input id="fb-name" maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="fb-contact">Discord or email (optional)</Label><Input id="fb-contact" maxLength={100} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="Only if you want a reply" /></div>
            <div className="space-y-1.5"><Label htmlFor="fb-msg">Your feedback</Label><Textarea id="fb-msg" rows={6} maxLength={2000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />{err && <p className="text-sm text-destructive">{err}</p>}</div>
            <Button onClick={submit} disabled={busy} className="w-full">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send feedback</Button>
          </>)}
        </div>
      </section>
    </>
  );
}

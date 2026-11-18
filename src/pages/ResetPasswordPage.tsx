import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import PasswordInput from '../components/PasswordInput';
import { Label } from '@project/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Spinner } from '../components/States';

export default function ResetPasswordPage() {
  const { user, isLoading } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError('We could not update your password. The reset link may have expired — request a new one.');
    toast.success('Password updated');
    nav('/', { replace: true });
  };

  if (isLoading) return <Spinner />;
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border bg-secondary"><KeyRound className="h-6 w-6 text-primary" /></div>
          <h1 className="mt-4 text-3xl font-bold">Choose a new password</h1>
        </div>
        {!user ? (
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            <p>Open the password reset link from your email on this device to continue. The link may have expired.</p>
            <Button onClick={() => nav('/login')}>Back to log in</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5"><Label htmlFor="rp-new">New password</Label><PasswordInput id="rp-new" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="rp-confirm">Confirm password</Label><PasswordInput id="rp-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update password</Button>
          </form>
        )}
      </div>
    </div>
  );
}

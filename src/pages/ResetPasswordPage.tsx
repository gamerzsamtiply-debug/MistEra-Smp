import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import PasswordInput from '../components/PasswordInput';
import { Label } from '@project/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Spinner } from '../components/States';
import { LOGO_MARK } from '../lib/brand';

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
    if (err) return setError('We could not update your password. The reset link may have expired - request a new one.');
    toast.success('Password updated');
    nav('/', { replace: true });
  };

  if (isLoading) return <Spinner />;
  return (
    <div className="dark auth">
      <div className="auth-top">
        <Link to="/" className="flex items-center gap-2.5" aria-label="MistEra SMP home">
          <img src={LOGO_MARK} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="font-display text-[15px] font-semibold tracking-tight">MISTERA SMP</span>
        </Link>
      </div>
      <div className="auth-stage">
      <div className="auth-card">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-border bg-secondary"><KeyRound className="h-5 w-5 text-primary" /></div>
          <h1 className="mt-4 text-2xl font-semibold">Choose a new password</h1>
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
    </div>
  );
}

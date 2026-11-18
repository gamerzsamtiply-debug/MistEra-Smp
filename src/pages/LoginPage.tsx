import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { supabase } from '@/lib/supabase';
import { register } from '@/lib/api';
import { safeNext, useAuth } from '@/lib/auth';
import PasswordInput from '../components/PasswordInput';
import GoogleButton from '../components/GoogleButton';
import { LOGO_MARK } from '../lib/brand';

type Mode = 'login' | 'signup' | 'forgot';

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a few minutes and try again.';
  return 'Something went wrong. Please check your details and try again.';
}

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isLoading && user) nav(next, { replace: true });
  }, [isLoading, user, next, nav]);

  const switchMode = (m: Mode) => { setMode(m); setError(''); setNotice(''); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Please enter a valid email address.');
    if (mode !== 'forgot' && password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${window.location.origin}/reset-password` });
        if (err) throw err;
        setNotice('If an account exists for that email, a password reset link is on its way.');
        return;
      }
      if (mode === 'signup') {
        // The account is created ready to use (no confirmation e-mail), then we sign straight in.
        try {
          await register({ email: mail, password });
        } catch (err) {
          const e2 = err as { userFacingMessage?: string; status?: number };
          setError(e2.status && e2.status < 500 && e2.userFacingMessage ? e2.userFacingMessage : 'We could not create your account right now. Please try again.');
          return;
        }
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (err) throw err;
      toast.success(mode === 'signup' ? 'Account created. Welcome to MistEra SMP!' : 'Welcome back!');
    } catch (err) {
      setError(friendly((err as Error).message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password';

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <img src={LOGO_MARK} alt="MistEra SMP logo" width={48} height={48} className="mx-auto h-12 w-12 object-contain" />
          <h1 className="mt-4 text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'login' && 'Welcome back to MistEra SMP.'}
            {mode === 'signup' && 'Join the community to submit images and suggestions.'}
            {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {notice ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4 text-sm"><MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>{notice}</p></div>
        ) : (
          <div className="space-y-4">
            {mode !== 'forgot' && (
              <>
                <GoogleButton next={next} onError={setError} />
                <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              </>
            )}
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1.5"><Label htmlFor="lg-email">Email</Label><Input id="lg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {mode !== 'forgot' && (
                <div className="space-y-1.5"><Label htmlFor="lg-pass">Password</Label><PasswordInput id="lg-pass" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </Button>
            </form>
          </div>
        )}

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === 'login' && (
            <>
              <p>New here? <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMode('signup')}>Create an account</button></p>
              <p><button type="button" className="hover:text-foreground hover:underline" onClick={() => switchMode('forgot')}>Forgot your password?</button></p>
            </>
          )}
          {mode === 'signup' && <p>Already have an account? <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMode('login')}>Sign in</button></p>}
          {mode === 'forgot' && <p><button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMode('login')}>Back to sign in</button></p>}
          <p><Link to="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link></p>
        </div>
      </div>
    </div>
  );
}

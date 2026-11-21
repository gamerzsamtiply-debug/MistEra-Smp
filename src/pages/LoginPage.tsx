import { useEffect, useRef, useState, type FormEvent } from 'react';
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
import PasswordStrength from '../components/PasswordStrength';
import { rateStrength } from '@/lib/password';
import { sfx } from '@/lib/sfx';
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

  // Someone who just created an account lands on the Home page; a normal sign-in returns to where they came from.
  const dest = useRef(next);
  useEffect(() => {
    if (!isLoading && user) nav(dest.current, { replace: true });
  }, [isLoading, user, nav]);

  const switchMode = (m: Mode) => { sfx.tap(); setMode(m); setError(''); setNotice(''); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Please enter a valid email address.');
    if (mode !== 'forgot' && password.length < 8) return setError('Password must be at least 8 characters.');
    if (mode === 'signup' && rateStrength(password).level === 0) return setError('That password is too weak. Make it longer and mix letters, numbers and symbols.');
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
          dest.current = '/'; // account created: send them straight to Home
        } catch (err) {
          const e2 = err as { userFacingMessage?: string; status?: number };
          setError(e2.status && e2.status < 500 && e2.userFacingMessage ? e2.userFacingMessage : 'We could not create your account right now. Please try again.');
          return;
        }
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (err) throw err;
      toast.success(mode === 'signup' ? 'Account created. Welcome to MistEra SMP!' : 'Welcome back!');
      if (mode === 'signup') sfx.welcome(); else sfx.success();
    } catch (err) {
      setError(friendly((err as Error).message ?? '')); sfx.error();
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password';

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
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === 'login' && 'Welcome back to MistEra SMP.'}
            {mode === 'signup' && 'Join the community to submit images and suggestions.'}
            {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {notice ? (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-4 text-sm"><MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>{notice}</p></div>
        ) : (
          <div className="space-y-4">
            {mode !== 'forgot' && (
              <>
                <GoogleButton next={mode === 'signup' ? '/' : next} onError={setError} />
                <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              </>
            )}
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1.5"><Label htmlFor="lg-email">Email</Label><Input id="lg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {mode !== 'forgot' && (
                <div className="space-y-1.5"><Label htmlFor="lg-pass">Password</Label><PasswordInput id="lg-pass" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />{mode === 'signup' && <PasswordStrength password={password} />}</div>
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
    </div>
  );
}

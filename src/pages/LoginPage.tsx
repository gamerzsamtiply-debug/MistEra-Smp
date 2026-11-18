import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, LogIn, MailCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { supabase } from '@/lib/supabase';
import { safeNext, useAuth } from '@/lib/auth';
import { LOGO_MARK } from '../lib/brand';

type Mode = 'login' | 'signup' | 'forgot';
const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email address first — check your inbox for the confirmation link.';
  if (/already registered|already been registered/i.test(message)) return 'An account with this email already exists. Try logging in instead.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/password/i.test(message) && /(least|short|weak)/i.test(message)) return 'Please choose a stronger password (at least 8 characters).';
  return 'Something went wrong. Please check your details and try again.';
}

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isLoading && user) nav(next, { replace: true });
  }, [isLoading, user, next, nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Please enter a valid email address.');
    if (mode !== 'forgot' && password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (err) throw err;
        toast.success('Welcome back!');
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` } });
        if (err) throw err;
        if (!data.session) setNotice('Account created! Check your email for a confirmation link, then log in.');
        else toast.success('Account created — welcome to MistEra SMP!');
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${window.location.origin}/reset-password` });
        if (err) throw err;
        setNotice('If an account exists for that email, a password reset link is on its way.');
      }
    } catch (err) {
      setError(friendly((err as Error).message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` } });
    if (err) setError('Google sign-in is not available right now.');
  };

  const title = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Reset password';

  return (
    <div className="relative grid min-h-[70vh] place-items-center overflow-hidden px-4 py-12 sky-glow">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <div className="mb-6 text-center">
          <img src={LOGO_MARK} alt="MistEra SMP" className="mx-auto h-14 w-14 object-contain" />
          <h1 className="mt-4 text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'login' && 'Welcome back to MistEra SMP.'}
            {mode === 'signup' && 'Join the community to submit images and suggestions.'}
            {mode === 'forgot' && "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {notice ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4 text-sm"><MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>{notice}</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5"><Label htmlFor="lg-email">Email</Label><Input id="lg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            {mode !== 'forgot' && (
              <div className="space-y-1.5"><Label htmlFor="lg-pass">Password</Label><Input id="lg-pass" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : mode === 'signup' ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
              {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </Button>
            {GOOGLE_ENABLED && mode !== 'forgot' && (
              <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>Continue with Google</Button>
            )}
          </form>
        )}

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === 'login' && (
            <>
              <p>New here? <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode('signup'); setError(''); setNotice(''); }}>Create an account</button></p>
              <p><button type="button" className="hover:text-foreground hover:underline" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }}>Forgot your password?</button></p>
            </>
          )}
          {mode !== 'login' && <p><button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Back to log in</button></p>}
          <p><Link to="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link></p>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, Mail, MailCheck, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { register, resendConfirmation } from '@/lib/api';
import { safeNext, signInWithPasswordSecure, useAuth } from '@/lib/auth';
import GoogleButton from '../components/GoogleButton';
import PasswordStrength from '../components/PasswordStrength';
import { rateStrength } from '@/lib/password';
import { sfx } from '@/lib/sfx';
import { LOGO_MARK } from '../lib/brand';

type Mode = 'login' | 'signup' | 'forgot';

function friendly(err: unknown): string {
  const e = err as { userFacingMessage?: string; status?: number; message?: string };
  // The server writes these messages for people (wrong password, locked for 15 minutes, Gmail not confirmed yet...)
  if (e?.userFacingMessage && e.status && e.status < 500) return e.userFacingMessage;
  if (/rate limit|too many/i.test(e?.message ?? '')) return 'Too many attempts. Please wait a few minutes and try again.';
  return 'Something went wrong. Please check your details and try again.';
}

const GMAIL = /^[^\s@]+@(gmail|googlemail)\.com$/i;

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
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  // Someone who just created an account lands on the Welcome page (set avatar / name, or skip); a normal sign-in returns to where they came from.
  const dest = useRef(next);
  useEffect(() => {
    if (!isLoading && user) nav(dest.current, { replace: true });
  }, [isLoading, user, nav]);

  const switchMode = (m: Mode) => { sfx.tap(); setMode(m); setError(''); setNotice(''); setUnconfirmed(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Please enter a valid email address.');
    if (mode === 'signup' && !GMAIL.test(mail)) return setError('Please use a valid Gmail address (name@gmail.com). Other email providers are not accepted.');
    if (mode === 'signup' && password.length < 10) return setError('Password must be at least 10 characters.');
    if (mode === 'login' && !password) return setError('Please enter your password.');
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
        // The account is created locked; the person must click the link we e-mail to their Gmail address before it works.
        try {
          const r = await register({ email: mail, password });
          setNotice(r.confirmationSent
            ? `We sent a confirmation link to ${mail}. Open it (check spam too) to activate your account, then sign in.`
            : 'Your account was created, but we could not send the confirmation email just now. Sign in and choose "Resend confirmation link".');
          setPassword('');
          sfx.success();
        } catch (err) {
          const e2 = err as { userFacingMessage?: string; status?: number };
          setError(e2.status && e2.status < 500 && e2.userFacingMessage ? e2.userFacingMessage : 'We could not create your account right now. Please try again.');
          sfx.error();
        }
        return;
      }
      await signInWithPasswordSecure(mail, password, remember);
      toast.success('Welcome back!');
      sfx.success();
    } catch (err) {
      setError(friendly(err)); setUnconfirmed(/confirm your gmail/i.test(friendly(err))); sfx.error();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const mail = email.trim();
    if (!GMAIL.test(mail)) return setError('Enter your Gmail address above first.');
    setBusy(true);
    try { await resendConfirmation({ email: mail }); setError(''); setUnconfirmed(false); setNotice(`If ${mail} has an account waiting to be confirmed, a new link is on its way. Check spam too.`); }
    catch (err) { setError(friendly(err)); }
    finally { setBusy(false); }
  };

  const title = mode === 'login' ? 'Login' : mode === 'signup' ? 'Register' : 'Reset password';
  const submitLabel = mode === 'login' ? 'Login' : mode === 'signup' ? 'Create account' : 'Send reset link';

  return (
    <div className="dark auth">
      <div className="auth-top">
        <Link to="/" className="flex items-center gap-2.5" aria-label="MistEra SMP home">
          <img src={LOGO_MARK} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="font-display text-[15px] font-semibold tracking-tight">MISTERA SMP</span>
        </Link>
      </div>
      <div className="auth-stage">
      <div className="auth-card" role="dialog" aria-labelledby="auth-title">
        <Link to="/" className="auth-close" aria-label="Close and go back to the site"><X className="h-4 w-4" /></Link>
        <div className="mb-5 text-center">
          <h1 id="auth-title" className="auth-title">{title}</h1>
          {mode === 'signup' && <p className="auth-sub">Use your real Gmail address. We will email you a link to confirm it.</p>}
          {mode === 'forgot' && <p className="auth-sub">Enter your email and we'll send you a reset link.</p>}
        </div>

        {notice ? (
          <div className="auth-notice"><MailCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>{notice}</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <label className="gf">
              <span className="sr-only">Email</span>
              <input id="lg-email" type="email" inputMode="email" autoComplete="email" placeholder={mode === 'signup' ? 'Gmail address' : 'Email'} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
              <Mail className="gf-icon" aria-hidden="true" />
            </label>
            {mode !== 'forgot' && (
              <div>
                <label className="gf">
                  <span className="sr-only">Password</span>
                  <input id="lg-pass" type={showPw ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} />
                  <button type="button" className="gf-btn" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  <Lock className="gf-icon gf-icon-2" aria-hidden="true" />
                </label>
                {mode === 'signup' && <div className="mt-3"><PasswordStrength password={password} /></div>}
              </div>
            )}
            {mode === 'login' && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" className="auth-check" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember me</label>
                <button type="button" className="auth-link" onClick={() => switchMode('forgot')}>Forgot Password?</button>
              </div>
            )}
            {error && <p role="alert" className="auth-error">{error}</p>}
            {unconfirmed && <button type="button" className="auth-link text-xs" onClick={resend} disabled={busy}>Resend confirmation link</button>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}{submitLabel}
            </button>
            {mode !== 'forgot' && (
              <>
                <div className="auth-or"><span />or<span /></div>
                <GoogleButton next={mode === 'signup' ? '/welcome' : next} onError={setError} />
              </>
            )}
          </form>
        )}

        <div className="mt-5 space-y-1.5 text-center text-xs auth-foot">
          {mode === 'login' && <p>Don't have an account? <button type="button" className="auth-link font-semibold" onClick={() => switchMode('signup')}>Register</button></p>}
          {mode === 'signup' && <p>Already have an account? <button type="button" className="auth-link font-semibold" onClick={() => switchMode('login')}>Login</button></p>}
          {mode === 'forgot' && <p><button type="button" className="auth-link font-semibold" onClick={() => switchMode('login')}>Back to login</button></p>}
          <p><Link to="/terms" className="auth-link">Terms of Service</Link></p>
        </div>
      </div>
      </div>
    </div>
  );
}

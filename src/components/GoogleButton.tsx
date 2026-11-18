import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { supabase } from '@/lib/supabase';

const G = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.4v3.09A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.36 14.3a7.2 7.2 0 0 1 0-4.6V6.61H1.4a12 12 0 0 0 0 10.78l3.96-3.09z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.4 6.61l3.96 3.09A7.15 7.15 0 0 1 12 4.77z" />
  </svg>
);

/** "Continue with Google" - used on both Sign in and Sign up. Requires the Google provider to be enabled in Supabase. */
export default function GoogleButton({ next, onError }: { next: string; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    onError('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login?next=${encodeURIComponent(next)}` } });
    if (error) {
      setBusy(false);
      onError('Google sign-in is not available right now. Please use your email and password.');
    }
    // On success the browser is redirected to Google, so there is nothing more to do here.
  };
  return (
    <Button type="button" variant="outline" size="lg" className="w-full gap-2" onClick={go} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : G}Continue with Google
    </Button>
  );
}

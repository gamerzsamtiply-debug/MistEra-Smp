import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Lock, RefreshCw, SearchX, ServerCrash, ShieldX, CloudOff, Wrench, type LucideIcon } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { loginWithRedirect } from '@/lib/auth';

type Code = '404' | '403' | '401' | '500' | '503' | 'maintenance';
const CFG: Record<Code, { icon: LucideIcon; title: string; text: string }> = {
  '404': { icon: SearchX, title: 'Page Not Found', text: "The page you're looking for doesn't exist or may have been moved." },
  '403': { icon: ShieldX, title: 'Access Forbidden', text: "You don't have permission to access this page." },
  '401': { icon: Lock, title: 'Authentication Required', text: 'You need to log in to view this page.' },
  '500': { icon: ServerCrash, title: 'Something Went Wrong', text: 'Something went wrong while processing your request. Please try again.' },
  '503': { icon: CloudOff, title: 'Service Unavailable', text: 'This service is temporarily unavailable. Please retry in a moment.' },
  maintenance: { icon: Wrench, title: 'Under Maintenance', text: '' },
};

export default function ErrorPage({ code, message, onRetry, full }: { code: Code; message?: string; onRetry?: () => void; full?: boolean }) {
  const nav = useSafeNavigate();
  const c = CFG[code];
  const retry = onRetry ?? (() => window.location.reload());
  return (
    <div className={`relative grid place-items-center overflow-hidden px-4 sky-glow ${full ? 'min-h-screen' : 'min-h-[70vh]'}`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl border border-border bg-card">
          <c.icon className="h-9 w-9 text-primary" />
        </div>
        {code !== 'maintenance' && <p className="font-display text-7xl font-extrabold text-gradient">{code}</p>}
        <h1 className="mt-2 text-3xl font-bold">{c.title}</h1>
        <p className="mt-3 text-muted-foreground">{message || c.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {code === '401' && <Button size="lg" onClick={() => loginWithRedirect()}><Lock className="mr-2 h-4 w-4" />Log in</Button>}
          {(code === '500' || code === '503') && <Button size="lg" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />{code === '503' ? 'Retry' : 'Try again'}</Button>}
          {code === '404' && nav && <Button size="lg" variant="outline" onClick={() => nav(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Go back</Button>}
          {code !== 'maintenance' && <Button size="lg" variant={code === '404' || code === '403' ? 'default' : 'outline'} onClick={() => (window.location.href = '/')}><Home className="mr-2 h-4 w-4" />{code === '404' ? 'Go home' : 'Return home'}</Button>}
        </div>
      </motion.div>
    </div>
  );
}

function useSafeNavigate() {
  try { return useNavigate(); } catch { return null; }
}

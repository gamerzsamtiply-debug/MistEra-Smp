import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { installShield } from '@/lib/shield';
import { useSite } from '../lib/site';

/** Production only, and never for admins (they may need DevTools to maintain the site). */
export default function Shield() {
  const { me } = useSite();
  const [open, setOpen] = useState(false);
  const skip = !import.meta.env.PROD || !!me?.isAdmin;
  useEffect(() => {
    if (skip) { setOpen(false); return; }
    return installShield(setOpen);
  }, [skip]);
  if (skip || !open) return null;
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-background p-6 text-center" role="alertdialog" aria-label="Developer tools detected">
      <div className="max-w-sm space-y-3">
        <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
        <h2 className="text-xl font-semibold">Developer tools are not allowed here</h2>
        <p className="text-sm text-muted-foreground">Please close the developer tools to keep using MistEra SMP.</p>
      </div>
    </div>
  );
}

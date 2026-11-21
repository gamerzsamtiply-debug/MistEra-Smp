import { useEffect, useRef } from 'react';
import { rateStrength } from '@/lib/password';
import { sfx } from '@/lib/sfx';
import { cn } from '@project/components/lib/utils';

const COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-cyan-400'];
const TEXT = ['text-rose-500', 'text-amber-500', 'text-emerald-500', 'text-cyan-400'];

/** Live Weak / Medium / Strong / Extreme meter. The label pops and a soft note plays when the level changes. */
export default function PasswordStrength({ password }: { password: string }) {
  const s = rateStrength(password);
  const prev = useRef<number>(-1);
  useEffect(() => {
    const cur = password ? s.level : -1;
    if (cur !== prev.current && cur >= 0 && prev.current !== -1) sfx.strength(cur);
    if (cur >= 0 && prev.current === -1) sfx.strength(cur);
    prev.current = cur;
  }, [password, s.level]);
  if (!password) return null;
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5" role="progressbar" aria-label="Password strength" aria-valuemin={0} aria-valuemax={3} aria-valuenow={s.level}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full bg-secondary transition-all duration-300', i <= s.level && COLORS[s.level])} style={{ transform: i <= s.level ? 'scaleY(1.25)' : undefined }} />
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span key={s.level} className={cn('strength-pop font-semibold', TEXT[s.level])}>{s.label}</span>
        <span className="truncate text-muted-foreground">{s.hints[0] ?? (s.level === 3 ? 'Excellent password.' : 'Looks good.')}</span>
      </div>
    </div>
  );
}

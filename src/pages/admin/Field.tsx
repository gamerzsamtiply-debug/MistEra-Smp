import type { ReactNode } from 'react';
import { Label } from '@project/components/ui/label';

export default function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}{error && <p className="text-sm text-destructive">{error}</p>}</div>;
}

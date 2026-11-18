import type { ReactNode } from 'react';

export default function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-card/40">
      <div className="container mx-auto px-4 py-14 md:py-20">
        <p className="label">{eyebrow}</p>
        <h1 className="mt-3 text-4xl md:text-6xl font-bold">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

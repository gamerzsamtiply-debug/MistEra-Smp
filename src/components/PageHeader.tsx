import type { ReactNode } from 'react';

export default function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="border-b border-border">
      <div className="wrap py-10 md:py-14">
        <p className="label">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

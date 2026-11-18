import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export default function PageHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-card/40">
      <div className="container mx-auto px-4 py-14 md:py-20">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="label">{eyebrow}</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-3 text-4xl md:text-6xl font-black">{title}</motion.h1>
        {subtitle && <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</motion.p>}
        {children}
      </div>
    </section>
  );
}

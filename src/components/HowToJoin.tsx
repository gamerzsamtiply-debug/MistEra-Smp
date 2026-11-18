import Reveal from './Reveal';
import type { Step } from '../lib/site';

export default function HowToJoin({ steps }: { steps: Step[] }) {
  return (
    <div className="relative space-y-4">
      
      {steps.map((s, i) => (
        <Reveal key={s.id} delay={i * 0.08}>
          <div className="relative flex flex-col gap-5 border border-border bg-background p-6 md:flex-row md:pl-24">
            <div className="grid h-12 w-12 shrink-0 place-items-center border-2 border-border bg-secondary font-mono text-lg font-semibold text-primary md:absolute md:left-6 md:top-6">{String(i + 1).padStart(2, '0')}</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{s.title}</h3>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{s.instructions}</p>
            </div>
            {s.imageUrl && <img src={s.imageUrl} alt={`Step ${i + 1}: ${s.title}`} loading="lazy" decoding="async" className="w-full object-cover md:w-64" />}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

import type { Step } from '../lib/site';

export default function HowToJoin({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.id} className="surface flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-5 md:p-6">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-semibold text-primary">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold md:text-lg">{s.title}</h3>
            <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{s.instructions}</p>
          </div>
          {s.imageUrl && <img src={s.imageUrl} alt={`Step ${i + 1}: ${s.title}`} loading="lazy" decoding="async" className="w-full rounded-lg object-cover md:w-56" />}
        </li>
      ))}
    </ol>
  );
}

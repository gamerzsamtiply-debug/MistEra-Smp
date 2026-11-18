import { Link } from 'react-router-dom';
import Reveal from './Reveal';

export default function SectionTitle({ eyebrow, title, to, cta }: { eyebrow: string; title: string; to?: string; cta?: string }) {
  return (
    <Reveal className="mb-8 flex items-end justify-between gap-4">
      <div><p className="text-xs uppercase text-primary">{eyebrow}</p><h2 className="mt-2 text-3xl md:text-4xl font-bold">{title}</h2></div>
      {to && <Link to={to} className="shrink-0 text-sm font-semibold text-primary hover:underline">{cta ?? 'View all'} &gt;</Link>}
    </Reveal>
  );
}

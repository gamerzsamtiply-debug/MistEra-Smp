import { Link } from 'react-router-dom';
import Reveal from './Reveal';

export default function SectionTitle({ eyebrow, title, to, cta }: { eyebrow: string; title: string; to?: string; cta?: string }) {
  return (
    <Reveal className="mb-8 flex items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-primary">{eyebrow}</p><h2 className="mt-1 text-2xl md:text-3xl font-semibold">{title}</h2></div>
      {to && <Link to={to} className="shrink-0 text-sm font-semibold text-primary hover:underline">{cta ?? 'View all'} &gt;</Link>}
    </Reveal>
  );
}

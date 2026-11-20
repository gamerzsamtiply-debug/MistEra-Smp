import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Fade-and-rise entrance when the block scrolls into view (CSS in index.css: .reveal / .reveal.is-in).
 * Content is visible straight away if IntersectionObserver is missing, and animations are switched off for
 * visitors who prefer reduced motion (see the media query at the end of index.css).
 */
export default function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return <div ref={ref} className={`reveal ${seen ? 'is-in' : ''} ${className}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>{children}</div>;
}

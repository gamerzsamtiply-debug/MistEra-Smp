import type { ReactNode } from 'react';

/** Plain wrapper. (Scroll-reveal animation was removed: it delayed content and cost bundle size.) */
export default function Reveal({ children, className }: { children: ReactNode; delay?: number; className?: string }) {
  return <div className={className}>{children}</div>;
}

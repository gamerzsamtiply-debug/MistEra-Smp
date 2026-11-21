import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { trackView } from '@/lib/api';
import { visitorId } from '@/lib/visitor';
import { sfx } from '@/lib/sfx';
import Footer from './Footer';
import ErrorBoundary from './ErrorBoundary';
import { DelayedSpinner } from './States';
import { useRouteSeo } from '../lib/seo-dom';

/** Sign-in pages and the admin dashboard draw their own full-screen layout; every other page gets the site navigation. */
const OWN_LAYOUT = ['/login', '/reset-password', '/admin'];

export default function Layout() {
  const loc = useLocation();
  useRouteSeo();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  // count the visit (anonymous id; the server ignores /admin and sign-in pages) and play a soft page sound after the first load
  const first = useRef(true);
  useEffect(() => {
    if (!first.current) sfx.page();
    first.current = false;
    const t = window.setTimeout(() => { trackView({ visitorId: visitorId(), path: loc.pathname }).catch(() => undefined); }, 400);
    return () => window.clearTimeout(t);
  }, [loc.pathname]);
  const bare = OWN_LAYOUT.some((p) => loc.pathname === p || loc.pathname.startsWith(p + '/'));
  const page = (
    // keyed boundary: an error on one page never sticks to the next one
    <ErrorBoundary key={loc.pathname}>
      <Suspense fallback={<DelayedSpinner />}><div className="page-enter"><Outlet /></div></Suspense>
    </ErrorBoundary>
  );
  if (bare) return <main>{page}</main>;
  return (
    <div className="min-h-screen">
      <ErrorBoundary silent><Navbar /></ErrorBoundary>
      <div className="app-main flex min-h-screen flex-col">
        <main className="flex-1">{page}</main>
        <ErrorBoundary silent><Footer /></ErrorBoundary>
      </div>
      <ErrorBoundary silent><BottomNav /></ErrorBoundary>
    </div>
  );
}

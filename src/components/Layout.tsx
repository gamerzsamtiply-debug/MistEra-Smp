import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ErrorBoundary from './ErrorBoundary';
import { DelayedSpinner } from './States';
import { useRouteSeo } from '../lib/seo-dom';

/** Sign-in pages and the admin dashboard draw their own full-screen layout; every other page gets the site navigation. */
const OWN_LAYOUT = ['/login', '/reset-password', '/admin'];

export default function Layout() {
  const loc = useLocation();
  useRouteSeo();
  useEffect(() => window.scrollTo(0, 0), [loc.pathname]);
  const bare = OWN_LAYOUT.some((p) => loc.pathname === p || loc.pathname.startsWith(p + '/'));
  const page = (
    // keyed boundary: an error on one page never sticks to the next one
    <ErrorBoundary key={loc.pathname}>
      <Suspense fallback={<DelayedSpinner />}><Outlet /></Suspense>
    </ErrorBoundary>
  );
  if (bare) return <main>{page}</main>;
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="app-main flex min-h-screen flex-col">
        <main className="flex-1">{page}</main>
        <Footer />
      </div>
    </div>
  );
}

import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ErrorBoundary from './ErrorBoundary';
import { Spinner } from './States';
import { useRouteSeo } from '../lib/seo-dom';

export default function Layout() {
  const loc = useLocation();
  useRouteSeo();
  useEffect(() => window.scrollTo(0, 0), [loc.pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* keyed boundary: an error on one page never sticks to the next one */}
        <ErrorBoundary key={loc.pathname}>
          <Suspense fallback={<Spinner />}><Outlet /></Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

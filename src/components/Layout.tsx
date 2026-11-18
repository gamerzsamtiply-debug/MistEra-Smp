import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ErrorBoundary from './ErrorBoundary';

export default function Layout() {
  const loc = useLocation();
  useEffect(() => window.scrollTo(0, 0), [loc.pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main key={loc.pathname} className="flex-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}

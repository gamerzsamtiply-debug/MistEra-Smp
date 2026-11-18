import { useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Toaster } from '@project/components/ui/sonner';
import { SiteProvider, useSite } from './lib/site';
import Layout from './components/Layout';
import Intro from './components/Intro';
import ErrorPage from './components/ErrorPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Spinner } from './components/States';
import Home from './pages/Home';
import ContentPage from './pages/ContentPage';
import StaffPage from './pages/StaffPage';
import PartnersPage from './pages/PartnersPage';
import PostsPage from './pages/PostsPage';
import AlbumPage from './pages/AlbumPage';
import PublicProfile from './pages/PublicProfile';
import ProfilePage from './pages/ProfilePage';
import SuggestionsPage from './pages/SuggestionsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

if (typeof document !== 'undefined') document.documentElement.classList.add('dark');

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <ErrorPage code="401" message="You need to log in or create an account to view this page." />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { me, meLoading } = useSite();
  if (isLoading || (user && meLoading)) return <Spinner label="Checking permissions…" />;
  if (!user) return <ErrorPage code="401" message="Please log in to access the Admin Panel." />;
  if (!me?.isAdmin) return <ErrorPage code="403" message="You don't have permission to access the Admin Panel." />;
  return <>{children}</>;
}

function Gate({ children }: { children: ReactNode }) {
  const { settings, error, reload, me } = useSite();
  const { pathname } = useLocation(); // re-evaluate the maintenance exemption on every client-side navigation
  if (error && !settings) return <ErrorPage full code={error.kind === 'network' ? '503' : '503'} message={error.kind === 'network' ? "We're having trouble connecting. Check your internet connection and retry." : undefined} onRetry={reload} />;
  if (!settings) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  // Admin status comes from the server (getMe); everyone else sees the maintenance page.
  const exempt = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/reset-password');
  if (settings.maintenanceMode && !me?.isAdmin && !exempt) {
    return <ErrorPage full code="maintenance" message={settings.maintenanceMessage || 'We are performing maintenance. Please check back soon.'} />;
  }
  return <>{children}</>;
}

export default function App() {
  // sessionStorage can throw (Safari private mode, blocked cookies); the intro should never take the site down.
  const [intro, setIntro] = useState(() => {
    try { return !sessionStorage.getItem('mistera-intro'); } catch { return true; }
  });
  return (
    <ErrorBoundary full>
      <SiteProvider>
        {intro && <Intro onDone={() => { try { sessionStorage.setItem('mistera-intro', '1'); } catch { /* ignore */ } setIntro(false); }} />}
        <BrowserRouter>
          <Gate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/information" element={<ContentPage slug="information" />} />
                <Route path="/terms" element={<ContentPage slug="terms" />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/partners" element={<PartnersPage />} />
                <Route path="/announcements" element={<PostsPage kind="Announcement" />} />
                <Route path="/updates" element={<PostsPage kind="Update" />} />
                <Route path="/album" element={<AlbumPage />} />
                <Route path="/u/:id" element={<PublicProfile />} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/suggestions" element={<RequireAuth><SuggestionsPage /></RequireAuth>} />
                <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/401" element={<ErrorPage code="401" />} />
                <Route path="/403" element={<ErrorPage code="403" />} />
                <Route path="/500" element={<ErrorPage code="500" />} />
                <Route path="/503" element={<ErrorPage code="503" />} />
                <Route path="*" element={<ErrorPage code="404" />} />
              </Route>
            </Routes>
          </Gate>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </SiteProvider>
    </ErrorBoundary>
  );
}

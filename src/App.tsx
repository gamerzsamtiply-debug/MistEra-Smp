import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Toaster } from '@project/components/ui/sonner';
import { SiteProvider, useSite } from './lib/site';
import Layout from './components/Layout';
import ErrorPage from './components/ErrorPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Spinner } from './components/States';
import Home from './pages/Home';
import { lazyRetry } from './lib/lazyRetry';
import { markVisited } from './lib/firstVisit';
const ContentPage = lazyRetry(() => import('./pages/ContentPage'));
const StaffPage = lazyRetry(() => import('./pages/StaffPage'));
const PartnersPage = lazyRetry(() => import('./pages/PartnersPage'));
const PostsPage = lazyRetry(() => import('./pages/PostsPage'));
const AlbumPage = lazyRetry(() => import('./pages/AlbumPage'));
const PublicProfile = lazyRetry(() => import('./pages/PublicProfile'));
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage'));
const SuggestionsPage = lazyRetry(() => import('./pages/SuggestionsPage'));
const AdminPage = lazyRetry(() => import('./pages/AdminPage'));
const LoginPage = lazyRetry(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazyRetry(() => import('./pages/ResetPasswordPage'));

const PRELOAD = [ContentPage, StaffPage, PartnersPage, PostsPage, AlbumPage, LoginPage];

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
  useEffect(() => {
    if (!settings) return;
    markVisited();
    // download the other pages in the background so clicking through never waits on a loading screen
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1500));
    idle(() => PRELOAD.forEach((c) => c.preload()));
  }, [!!settings]);
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
  return (
    <ErrorBoundary full>
      <SiteProvider>
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

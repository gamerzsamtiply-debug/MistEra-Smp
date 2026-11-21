import { lazy, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Toaster } from '@project/components/ui/sonner';
import { SiteProvider, useSite } from './lib/site';
import Layout from './components/Layout';
import ErrorPage from './components/ErrorPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Spinner } from './components/States';
import Home from './pages/Home';
import { ThemeProvider } from './lib/theme';
import StaffPage from './pages/StaffPage';
import PartnersPage from './pages/PartnersPage';
import PostsPage from './pages/PostsPage';
import AlbumPage from './pages/AlbumPage';
import LoginPage from './pages/LoginPage';
import { markVisited } from './lib/firstVisit';
import Shield from './components/Shield';
const ContentPage = lazy(() => import('./pages/ContentPage'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SuggestionsPage = lazy(() => import('./pages/SuggestionsPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));


function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <ErrorPage code="401" message="You need to log in or create an account to view this page." />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { me, meLoading } = useSite();
  if (isLoading || (user && meLoading)) return <Spinner label="Checking permissions..." />;
  if (!user) return <ErrorPage code="401" message="Please log in to access the Admin Panel." />;
  if (!me?.isAdmin) return <ErrorPage code="403" message="You don't have permission to access the Admin Panel." />;
  return <>{children}</>;
}

function Gate({ children }: { children: ReactNode }) {
  const { settings, error, reload, me } = useSite();
  const { pathname } = useLocation(); // re-evaluate the maintenance exemption on every client-side navigation
  useEffect(() => { if (settings) markVisited(); }, [!!settings]);
  // Site settings could not be loaded and nothing is cached: say WHY (setup problem, network, server) instead of a bare error.
  if (error && !settings) {
    const setup = error.title === 'Setup needed';
    return <ErrorPage full code="503" message={setup ? error.message : error.kind === 'network' ? "We're having trouble connecting. Check your internet connection and retry." : undefined} detail={!setup && error.kind === 'server' ? `Reference: ${error.correlationId}. If this keeps happening, open ${window.location.origin}/api/health (POST) or Admin > Overview > Setup check.` : undefined} onRetry={reload} />;
  }
  if (!settings) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  // Admin status comes from the server (getMe); everyone else sees the maintenance page.
  const exempt = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/reset-password');
  if (settings.maintenanceMode && !me?.isAdmin && !exempt) {
    return <ErrorPage full code="maintenance" message={settings.maintenanceMessage || 'We are performing maintenance. Please check back soon.'} />;
  }
  return <><Shield />{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
    <ErrorBoundary full>
      <SiteProvider>
        <BrowserRouter>
          <Gate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/information" element={<ContentPage slug="information" />} />
                <Route path="/about" element={<ContentPage slug="about" />} />
                <Route path="/rules" element={<ContentPage slug="rules" />} />
                <Route path="/terms" element={<ContentPage slug="terms" />} />
                <Route path="/privacy" element={<ContentPage slug="privacy" />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/partners" element={<PartnersPage />} />
                <Route path="/announcements" element={<PostsPage kind="Announcement" />} />
                <Route path="/updates" element={<PostsPage kind="Update" />} />
                <Route path="/album" element={<AlbumPage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/u/:id" element={<PublicProfile />} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route path="/suggestions" element={<RequireAuth><SuggestionsPage /></RequireAuth>} />
                <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/401" element={<ErrorPage code="401" />} />
                <Route path="/403" element={<ErrorPage code="403" />} />
                <Route path="/500" element={<Navigate to="/" replace />} />
                <Route path="/503" element={<ErrorPage code="503" />} />
                <Route path="*" element={<ErrorPage code="404" />} />
              </Route>
            </Routes>
          </Gate>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </SiteProvider>
    </ErrorBoundary>
    </ThemeProvider>
  );
}

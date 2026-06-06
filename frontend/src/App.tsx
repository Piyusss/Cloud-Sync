import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { FilesPage } from './pages/FilesPage';
import { SharedPage } from './pages/SharedPage';
import { TrashPage } from './pages/TrashPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SharePage } from './pages/SharePage';
import { SearchPage } from './pages/SearchPage';

// Lazy-loaded so the Mermaid library only ships when /docs is visited
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })));

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY.startsWith('PASTE')) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="w-10 h-10 bg-surface-800 border border-surface-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-surface-200 text-lg">⚠</span>
          </div>
          <p className="text-white font-medium mb-2">Clerk key missing</p>
          <p className="text-surface-400 text-sm mb-4">
            Add your Clerk publishable key to <code className="text-brand-400">frontend/.env</code>
          </p>
          <div className="bg-surface-800 rounded p-3 text-left text-xs font-mono text-surface-300">
            VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
          </div>
          <p className="text-surface-600 text-xs mt-3">
            Get it from: Clerk Dashboard → API Keys → Publishable key
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/sign-in">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Clerk auth pages */}
              <Route
                path="/sign-in/*"
                element={
                  <div className="min-h-screen bg-surface-950 flex items-center justify-center">
                    <SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/files" />
                  </div>
                }
              />
              <Route
                path="/sign-up/*"
                element={
                  <div className="min-h-screen bg-surface-950 flex items-center justify-center">
                    <SignUp routing="path" path="/sign-up" fallbackRedirectUrl="/files" />
                  </div>
                }
              />

              {/* Public pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/share/:token" element={<SharePage />} />
              <Route
                path="/docs"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
                      </div>
                    }
                  >
                    <DocsPage />
                  </Suspense>
                }
              />

              {/* Protected app */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/home" element={<Navigate to="/files" replace />} />
                <Route path="/files" element={<FilesPage />} />
                <Route path="/files/:folderId" element={<FilesPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/shared" element={<SharedPage />} />
                <Route path="/trash" element={<TrashPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/files" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
    </ThemeProvider>
  );
}

export default App;

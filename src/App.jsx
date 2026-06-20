import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProfileProvider, useProfile } from "./context/ProfileContext";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";

// Pages
import HomePage from "./pages/HomePage";
import DetailPage from "./pages/DetailPage";
import PlayerPage from "./pages/PlayerPage";
import SearchPage from "./pages/SearchPage";
import WatchlistPage from "./pages/WatchlistPage";
import HistoryPage from "./pages/HistoryPage";
import SchedulePage from "./pages/SchedulePage";
import AuthPage from "./pages/AuthPage";
import ProfileSelection from "./pages/ProfileSelection";
import NewAndHotPage from "./pages/NewAndHotPage";
import MyAniStreamPage from "./pages/MyAniStreamPage";

// Route protection: requires authentication
function RequireAuth({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen flex-center">Loading session...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

// Route protection: requires authentication AND selected profile
function RequireProfile({ children }) {
  const { currentUser, loading: authLoading } = useAuth();
  const { activeProfile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return <div className="loading-screen flex-center">Loading profiles...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  if (!activeProfile) {
    return <Navigate to="/profiles" replace />;
  }

  return children;
}

// Standard App Shell Layout
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">{children}</main>
      <Footer />
      <style>{`
        .app-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .main-content {
          flex-grow: 1;
        }
        .loading-screen {
          height: 100vh;
          width: 100vw;
          background-color: var(--bg);
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ProfileProvider>
          <Routes>
            {/* Auth routes */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Profile Selection */}
            <Route 
              path="/profiles" 
              element={
                <RequireAuth>
                  <ProfileSelection />
                </RequireAuth>
              } 
            />

            {/* Protected Streaming Routes */}
            <Route 
              path="/" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <HomePage />
                  </AppLayout>
                </RequireProfile>
              } 
            />
            
            <Route 
              path="/anime/:id" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <DetailPage />
                  </AppLayout>
                </RequireProfile>
              } 
            />

            <Route 
              path="/watch/:animeId/:episodeId" 
              element={
                <RequireProfile>
                  <PlayerPage />
                </RequireProfile>
              } 
            />

            <Route 
              path="/search" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <SearchPage />
                  </AppLayout>
                </RequireProfile>
              } 
            />

            <Route 
              path="/watchlist" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <WatchlistPage />
                  </AppLayout>
                </RequireProfile>
              } 
            />

            <Route 
              path="/history" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <HistoryPage />
                  </AppLayout>
                </RequireProfile>
              } 
            />

            <Route 
              path="/schedule" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <SchedulePage />
                  </AppLayout>
                </RequireProfile>
              } 
            />

            <Route 
              path="/new-and-hot" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <NewAndHotPage />
                  </AppLayout>
                </RequireProfile>
              } 
            />

            <Route 
              path="/my-anistream" 
              element={
                <RequireProfile>
                  <AppLayout>
                    <MyAniStreamPage />
                  </AppLayout>
                </RequireProfile>
              } 
            />

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProfileProvider>
      </AuthProvider>
    </Router>
  );
}

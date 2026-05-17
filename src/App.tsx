import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { CoachPage } from './pages/CoachPage';
import { OnlinePage } from './pages/OnlinePage';
import { OnlineGamePage } from './pages/OnlineGamePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProPage } from './pages/ProPage';
import { ReplayPage } from './pages/ReplayPage';

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingScreen />;
  if (user) {
    const done = user.user_metadata?.onboarding_done as boolean | undefined;
    return <Navigate to={done ? '/home' : '/onboarding'} replace />;
  }
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  const done = user.user_metadata?.onboarding_done as boolean | undefined;
  if (done) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

export default function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    init().then(fn => { unsub = fn; });
    return () => { unsub?.(); };
  }, [init]);

  return (
    <Routes>
      <Route path="/auth"        element={<GuestRoute><AuthPage /></GuestRoute>} />
      <Route path="/onboarding"  element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
      <Route path="/home"        element={<AuthRoute><HomePage /></AuthRoute>} />
      <Route path="/play"        element={<AuthRoute><GamePage /></AuthRoute>} />
      <Route path="/coach"       element={<AuthRoute><CoachPage /></AuthRoute>} />
      <Route path="/online"        element={<AuthRoute><OnlinePage /></AuthRoute>} />
      <Route path="/online/:id"   element={<AuthRoute><OnlineGamePage /></AuthRoute>} />
      <Route path="/leaderboard"  element={<AuthRoute><LeaderboardPage /></AuthRoute>} />
      <Route path="/profile"      element={<AuthRoute><ProfilePage /></AuthRoute>} />
      <Route path="/pro"          element={<AuthRoute><ProPage /></AuthRoute>} />
      <Route path="/replay/:id"   element={<AuthRoute><ReplayPage /></AuthRoute>} />
      <Route path="*"             element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#262522',
      gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>⛀</div>
      <div style={{ color: '#999693', fontSize: 14 }}>Загрузка...</div>
    </div>
  );
}

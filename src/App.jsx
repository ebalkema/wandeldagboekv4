import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { VoiceProvider } from './context/VoiceContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

// Lazy load pagina's
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const NewWalkPage = lazy(() => import('./pages/NewWalkPage'));
const ActiveWalkPage = lazy(() => import('./pages/ActiveWalkPage'));
const WalkSummaryPage = lazy(() => import('./pages/WalkSummaryPage'));
const WalksPage = lazy(() => import('./pages/WalksPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const BirdingPage = lazy(() => import('./pages/BirdingPage'));
const BiodiversityPage = lazy(() => import('./pages/BiodiversityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Laadcomponent voor tijdens het laden van pagina's
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-primary-600 font-medium">Laden...</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <VoiceProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Publieke routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Beveiligde routes */}
              <Route path="/" element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="walks" element={<WalksPage />} />
                  <Route path="new-walk" element={<NewWalkPage />} />
                  <Route path="active-walk/:walkId" element={<ActiveWalkPage />} />
                  <Route path="walk/:walkId" element={<WalkSummaryPage />} />
                  <Route path="walk-summary/:walkId" element={<WalkSummaryPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="birding" element={<BirdingPage />} />
                  <Route path="biodiversity" element={<BiodiversityPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </VoiceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 
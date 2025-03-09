import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VoiceProvider } from './context/VoiceContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NewWalkPage from './pages/NewWalkPage';
import ActiveWalkPage from './pages/ActiveWalkPage';
import WalkSummaryPage from './pages/WalkSummaryPage';
import WalksPage from './pages/WalksPage';
import ProfilePage from './pages/ProfilePage';
import PodcastPage from './pages/PodcastPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <VoiceProvider>
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
                <Route path="podcast" element={<PodcastPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </VoiceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 
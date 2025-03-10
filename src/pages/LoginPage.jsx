import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getGlobalStats } from '../services/firestoreService';
import { FaUsers, FaRoute, FaEye, FaMedal } from 'react-icons/fa';

/**
 * Pagina voor gebruikersauthenticatie
 */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    totalWalks: 0,
    totalDistance: 0,
    totalObservations: 0,
    totalUsers: 0
  });
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Haal globale statistieken op
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const stats = await getGlobalStats();
        setGlobalStats(stats);
      } catch (error) {
        console.error('Fout bij het ophalen van globale statistieken:', error);
      }
    };
    
    fetchGlobalStats();
  }, []);

  // Inloggen met email en wachtwoord
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError('Inloggen mislukt. Controleer je email en wachtwoord.');
    } finally {
      setLoading(false);
    }
  };

  // Inloggen met Google
  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Inloggen met Google mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 flex flex-col md:flex-row gap-6">
      {/* Welkomstgedeelte met statistieken */}
      <div className="w-full md:w-1/2 bg-primary-50 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 mb-2">
            Welkom bij Wandeldagboek
          </h1>
          <p className="text-primary-700 mb-6">
            Ontdek de natuur, leg je observaties vast en deel je ervaringen met andere natuurliefhebbers.
          </p>
          
          <div className="bg-white rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Onze community in cijfers
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <FaUsers className="text-blue-600 text-xl" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{globalStats.totalUsers}</p>
                  <p className="text-sm text-gray-600">Gebruikers</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <FaRoute className="text-green-600 text-xl" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{globalStats.totalWalks}</p>
                  <p className="text-sm text-gray-600">Wandelingen</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-yellow-100 p-2 rounded-full mr-3">
                  <FaEye className="text-yellow-600 text-xl" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{globalStats.totalObservations}</p>
                  <p className="text-sm text-gray-600">Observaties</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-full mr-3">
                  <FaMedal className="text-purple-600 text-xl" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">
                    {(globalStats.totalDistance / 1000).toFixed(0)}
                  </p>
                  <p className="text-sm text-gray-600">Kilometer</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-primary-100 p-2 rounded-full mr-3 mt-1">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Leg je wandelingen vast</h3>
                <p className="text-sm text-gray-600">Houd je routes, afstanden en tijden bij</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary-100 p-2 rounded-full mr-3 mt-1">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Maak natuurobservaties</h3>
                <p className="text-sm text-gray-600">Leg planten, dieren en andere ontdekkingen vast</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary-100 p-2 rounded-full mr-3 mt-1">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Offline beschikbaar</h3>
                <p className="text-sm text-gray-600">Gebruik de app ook zonder internetverbinding</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Inlogformulier */}
      <div className="w-full md:w-1/2 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Inloggen</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Log in om je wandelingen te beheren</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                E-mailadres
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                Wachtwoord
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transition-colors duration-200 text-sm sm:text-base"
            >
              {loading ? 'Bezig met inloggen...' : 'Inloggen'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm sm:text-base">Of log in met</p>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transition-colors duration-200 text-sm sm:text-base"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              Nog geen account?{' '}
              <Link to="/register" className="text-primary-600 hover:underline">
                Registreer hier
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 
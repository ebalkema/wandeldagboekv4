import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserWalks } from '../services/firestoreService';
import { getCurrentLocation } from '../services/locationService';
import { getCachedWeatherData } from '../services/weatherService';
import { useVoice } from '../context/VoiceContext';
import WalkCard from '../components/WalkCard';
import VoiceButton from '../components/VoiceButton';
import WeatherDisplay from '../components/WeatherDisplay';

/**
 * Dashboard pagina
 */
const DashboardPage = () => {
  const { currentUser } = useAuth();
  const { processCommand } = useVoice();
  const navigate = useNavigate();
  
  const [walks, setWalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);

  // Haal wandelingen op
  useEffect(() => {
    const fetchWalks = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const walksData = await getUserWalks(currentUser.uid);
        setWalks(walksData);
      } catch (error) {
        console.error('Fout bij het ophalen van wandelingen:', error);
        setError('Kon wandelingen niet laden. Probeer het later opnieuw.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalks();
  }, [currentUser]);

  // Haal locatie en weer op
  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      try {
        const currentLocation = await getCurrentLocation();
        setLocation(currentLocation);
        
        const weatherData = await getCachedWeatherData(currentLocation.lat, currentLocation.lng);
        setWeather(weatherData);
      } catch (error) {
        console.error('Fout bij het ophalen van locatie of weer:', error);
      }
    };
    
    fetchLocationAndWeather();
  }, []);

  // Verwerk spraakcommando's
  const handleVoiceCommand = (text) => {
    const command = processCommand(text);
    
    if (command) {
      switch (command.type) {
        case 'START_WALK':
          navigate('/new-walk');
          break;
        default:
          // Geen actie voor andere commando's
          break;
      }
    }
  };

  // Actieve wandeling
  const activeWalk = walks.find(walk => !walk.endTime);

  return (
    <div className="max-w-full">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
        
        {weather && (
          <div className="self-end sm:self-auto">
            <WeatherDisplay weather={weather} size="medium" />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Actieve wandeling sectie */}
      {activeWalk ? (
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Actieve wandeling</h2>
            <Link 
              to={`/active-walk/${activeWalk.id}`}
              className="text-blue-600 hover:text-blue-800"
            >
              Ga naar wandeling
            </Link>
          </div>
          
          <WalkCard walk={activeWalk} />
        </div>
      ) : (
        <div className="mb-6 sm:mb-8 bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">Start een nieuwe wandeling</h2>
          
          <p className="text-gray-600 mb-4">
            Begin een nieuwe wandeling om je route en observaties vast te leggen.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link
              to="/new-walk"
              className="w-full sm:w-auto bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-center"
            >
              Nieuwe wandeling
            </Link>
            
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-500 mb-2">Of gebruik je stem</p>
              <VoiceButton 
                onResult={handleVoiceCommand}
                label="Spreek"
                color="primary"
                size="medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Recente wandelingen sectie */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Recente wandelingen</h2>
          <Link 
            to="/walks"
            className="text-blue-600 hover:text-blue-800"
          >
            Bekijk alle
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-6 sm:py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Wandelingen laden...</p>
          </div>
        ) : walks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
            <p className="text-gray-600">Je hebt nog geen wandelingen. Start je eerste wandeling!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {walks
              .filter(walk => walk.endTime) // Alleen voltooide wandelingen
              .slice(0, 3) // Maximaal 3 wandelingen
              .map(walk => (
                <WalkCard key={walk.id} walk={walk} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage; 
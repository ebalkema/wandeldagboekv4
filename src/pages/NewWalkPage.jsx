import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoice } from '../context/VoiceContext';
import { getCurrentLocation } from '../services/locationService';
import { getCachedWeatherData } from '../services/weatherService';
import { createWalk } from '../services/firestoreService';
import { isOnline, saveOfflineWalk } from '../services/offlineService';
import LazyMapComponent from '../components/LazyMapComponent';
import WeatherDisplay from '../components/WeatherDisplay';
import LazyVoiceButton from '../components/LazyVoiceButton';
import OfflineIndicator from '../components/OfflineIndicator';

/**
 * Pagina voor het starten van een nieuwe wandeling
 */
const NewWalkPage = () => {
  const { currentUser } = useAuth();
  const { isListening, transcript, startListening, stopListening, processCommand } = useVoice();
  const navigate = useNavigate();
  
  const [walkName, setWalkName] = useState('');
  const [isNamingWalk, setIsNamingWalk] = useState(false);
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!isOnline());

  // Controleer online status
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      setIsOffline(!isOnline());
    };

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  // Haal locatie en weer op
  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      try {
        const currentLocation = await getCurrentLocation();
        setLocation(currentLocation);
        
        // Alleen weer ophalen als we online zijn
        if (!isOffline) {
          const weatherData = await getCachedWeatherData(currentLocation.lat, currentLocation.lng);
          setWeather(weatherData);
        }
      } catch (error) {
        console.error('Fout bij het ophalen van locatie of weer:', error);
        setError('Kon locatie of weergegevens niet ophalen. Controleer je locatietoestemming.');
      }
    };
    
    fetchLocationAndWeather();
  }, [isOffline]);

  // Verwerk spraakcommando's
  useEffect(() => {
    if (!isListening && transcript && isNamingWalk) {
      setWalkName(transcript);
      setIsNamingWalk(false);
      
      // Start de wandeling automatisch na het benoemen
      handleStartWalk(transcript);
    }
  }, [isListening, transcript, isNamingWalk]);

  // Start een nieuwe wandeling
  const handleStartWalk = async (name) => {
    if (!currentUser || !location) {
      setError('Kan geen wandeling starten. Controleer je locatietoestemming.');
      return;
    }
    
    const walkNameToUse = name || walkName || `Wandeling ${new Date().toLocaleDateString()}`;
    
    try {
      setLoading(true);
      
      let walkId;
      
      if (isOffline) {
        console.log('Offline modus: wandeling opslaan in lokale opslag');
        walkId = saveOfflineWalk({
          userId: currentUser.uid,
          name: walkNameToUse,
          startLocation: location,
          weather: weather,
          startTime: new Date().toISOString(),
          pathPoints: [{ lat: location.lat, lng: location.lng }]
        });
      } else {
        console.log('Online modus: wandeling opslaan in Firestore');
        walkId = await createWalk(
          currentUser.uid,
          walkNameToUse,
          location,
          weather
        );
      }
      
      navigate(`/active-walk/${walkId}`);
    } catch (error) {
      console.error('Fout bij het starten van wandeling:', error);
      setError('Kon wandeling niet starten. Probeer het opnieuw.');
      setLoading(false);
    }
  };

  // Start spraakherkenning voor de naam van de wandeling
  const handleVoiceNaming = () => {
    setIsNamingWalk(true);
    startListening();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nieuwe wandeling</h1>
      
      {/* Offline indicator */}
      <OfflineIndicator />
      
      {/* Offline waarschuwing */}
      {isOffline && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Je bent offline. Je wandeling wordt lokaal opgeslagen en gesynchroniseerd wanneer je weer online bent.</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="h-64">
          <LazyMapComponent 
            currentLocation={location ? [location.lat, location.lng] : null}
            height="100%"
            offlineMode={isOffline}
          />
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Start een wandeling</h2>
            
            {weather && (
              <WeatherDisplay weather={weather} size="small" />
            )}
            
            {isOffline && !weather && (
              <div className="text-sm text-yellow-600">
                Weergegevens niet beschikbaar in offline modus
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="walkName" className="block text-gray-700 font-medium mb-2">
              Naam van de wandeling
            </label>
            
            <div className="flex">
              <input
                type="text"
                id="walkName"
                value={walkName}
                onChange={(e) => setWalkName(e.target.value)}
                placeholder="Geef je wandeling een naam"
                className="flex-grow px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <button
                onClick={handleVoiceNaming}
                className="bg-blue-100 text-blue-600 px-3 rounded-r-lg border border-l-0 hover:bg-blue-200 transition-colors duration-200"
                disabled={isListening}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
            
            {isNamingWalk && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                {transcript ? transcript : 'Spreek de naam van je wandeling in...'}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Annuleren
            </button>
            
            <button
              onClick={() => handleStartWalk()}
              disabled={loading || !location}
              className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'Bezig...' : 'Start wandeling'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <h3 className="font-medium text-blue-800 mb-2">Tip: Gebruik spraakcommando's</h3>
        <p className="text-blue-700 text-sm">
          Je kunt ook direct een wandeling starten met je stem. Zeg gewoon "Start wandeling" op het dashboard.
        </p>
      </div>
    </div>
  );
};

export default NewWalkPage; 
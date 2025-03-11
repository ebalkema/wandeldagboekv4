import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoice } from '../context/VoiceContext';
import { getCurrentLocation } from '../services/locationService';
import { getCachedWeatherData } from '../services/weatherService';
import { createWalk, getUserWalks, endWalk } from '../services/firestoreService';
import { isOnline, saveOfflineWalk, getOfflineWalks, endOfflineWalk } from '../services/offlineService';
import { getNearbyObservations } from '../services/ebirdService';
import LazyMapComponent from '../components/LazyMapComponent';
import WeatherDisplay from '../components/WeatherDisplay';
import LazyVoiceButton from '../components/LazyVoiceButton';
import OfflineIndicator from '../components/OfflineIndicator';
import { FaBinoculars } from 'react-icons/fa';

/**
 * Pagina voor het starten van een nieuwe wandeling
 */
const NewWalkPage = () => {
  const { currentUser, userSettings } = useAuth();
  const { isListening, transcript, startListening, stopListening, processCommand } = useVoice();
  const navigate = useNavigate();
  
  const [walkName, setWalkName] = useState('');
  const [isNamingWalk, setIsNamingWalk] = useState(false);
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [birdObservations, setBirdObservations] = useState([]);
  const [loadingBirds, setLoadingBirds] = useState(false);
  const [birdError, setBirdError] = useState('');
  const [radius, setRadius] = useState(userSettings?.birdRadius || 10);
  const [activeWalks, setActiveWalks] = useState([]);
  const [checkingActiveWalks, setCheckingActiveWalks] = useState(false);
  const [showActiveWalkWarning, setShowActiveWalkWarning] = useState(false);

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

  // Haal vogelwaarnemingen op wanneer de locatie beschikbaar is
  useEffect(() => {
    const fetchBirdObservations = async () => {
      if (!location || isOffline) return;
      
      try {
        setLoadingBirds(true);
        const birdRadius = userSettings?.birdRadius || radius;
        const observations = await getNearbyObservations(location.lat, location.lng, birdRadius, 7);
        
        // Converteer waarnemingen naar het juiste formaat voor de kaart
        const birdLocations = observations.map(obs => ({
          lat: obs.location.lat,
          lng: obs.location.lng,
          name: obs.dutchName || obs.commonName,
          scientificName: obs.scientificName,
          count: obs.howMany,
          date: obs.observationDate,
          locationName: obs.location.name,
          type: 'bird'
        }));
        
        setBirdObservations(birdLocations);
        setBirdError('');
      } catch (error) {
        console.error('Fout bij het ophalen van vogelwaarnemingen:', error);
        setBirdError('Kon vogelwaarnemingen niet laden.');
      } finally {
        setLoadingBirds(false);
      }
    };
    
    fetchBirdObservations();
  }, [location, isOffline, userSettings]);

  // Verwerk spraakcommando's
  useEffect(() => {
    if (!isListening && transcript && isNamingWalk) {
      setWalkName(transcript);
      setIsNamingWalk(false);
      
      // Start de wandeling automatisch na het benoemen
      handleStartWalk(transcript);
    }
  }, [isListening, transcript, isNamingWalk]);

  // Haal actieve wandelingen op
  useEffect(() => {
    const fetchActiveWalks = async () => {
      if (!currentUser) return;
      
      try {
        setCheckingActiveWalks(true);
        
        // Haal online wandelingen op
        const onlineWalks = await getUserWalks(currentUser.uid, 100);
        const activeOnlineWalks = onlineWalks.filter(walk => !walk.endTime);
        
        // Haal offline wandelingen op
        const offlineWalks = getOfflineWalks();
        const activeOfflineWalks = offlineWalks.filter(walk => !walk.endTime);
        
        // Combineer actieve wandelingen
        const allActiveWalks = [...activeOnlineWalks, ...activeOfflineWalks];
        setActiveWalks(allActiveWalks);
      } catch (error) {
        console.error('Fout bij het ophalen van actieve wandelingen:', error);
      } finally {
        setCheckingActiveWalks(false);
      }
    };
    
    fetchActiveWalks();
  }, [currentUser]);

  // Beëindig alle actieve wandelingen
  const handleEndActiveWalks = async () => {
    try {
      setLoading(true);
      
      // Beëindig elke actieve wandeling
      for (const walk of activeWalks) {
        if (isOffline) {
          // Offline modus: beëindig in lokale opslag
          endOfflineWalk(walk.id, location, 0);
        } else {
          // Online modus: beëindig in Firestore
          await endWalk(walk.id, location, 0);
        }
      }
      
      // Verberg de waarschuwing en start een nieuwe wandeling
      setShowActiveWalkWarning(false);
      handleStartNewWalk();
    } catch (error) {
      console.error('Fout bij het beëindigen van actieve wandelingen:', error);
      setError('Kon actieve wandelingen niet beëindigen. Probeer het later opnieuw.');
      setLoading(false);
    }
  };

  // Start een nieuwe wandeling (zonder controle op actieve wandelingen)
  const handleStartNewWalk = async () => {
    if (!currentUser || !location) {
      setError('Kan geen wandeling starten. Controleer je locatietoestemming.');
      return;
    }
    
    const walkNameToUse = walkName || `Wandeling ${new Date().toLocaleDateString()}`;
    
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
        // Online modus: wandeling opslaan in Firestore
        walkId = await createWalk({
          userId: currentUser.uid,
          name: walkNameToUse,
          startLocation: location,
          weather: weather,
          startTime: new Date()
        });
      }
      
      // Navigeer naar de actieve wandelingspagina
      navigate(`/active-walk/${walkId}`);
    } catch (error) {
      console.error('Fout bij het starten van de wandeling:', error);
      setError('Kon de wandeling niet starten. Probeer het later opnieuw.');
      setLoading(false);
    }
  };

  // Start een nieuwe wandeling
  const handleStartWalk = async (name) => {
    if (name) {
      setWalkName(name);
    }
    
    // Controleer of er actieve wandelingen zijn
    if (activeWalks.length > 0) {
      setShowActiveWalkWarning(true);
    } else {
      handleStartNewWalk();
    }
  };
  
  // Start spraakherkenning voor het benoemen van de wandeling
  const handleVoiceNaming = () => {
    setIsNamingWalk(true);
    startListening();
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      {isOffline && <OfflineIndicator />}
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Waarschuwing voor actieve wandelingen */}
      {showActiveWalkWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Actieve wandeling gevonden</h3>
            <p className="text-gray-700 mb-4">
              Je hebt nog {activeWalks.length === 1 ? 'een actieve wandeling' : `${activeWalks.length} actieve wandelingen`}. 
              Als je een nieuwe wandeling start, worden alle actieve wandelingen automatisch beëindigd.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowActiveWalkWarning(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleEndActiveWalks}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                disabled={loading}
              >
                {loading ? 'Bezig...' : 'Doorgaan'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="h-64">
          <LazyMapComponent 
            currentLocation={location ? [location.lat, location.lng] : null}
            height="100%"
            offlineMode={isOffline}
            birdLocations={birdObservations}
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
              <div className="mt-2 text-sm text-blue-600 animate-pulse">
                Luisteren... Spreek de naam van je wandeling in.
              </div>
            )}
          </div>
          
          {!isOffline && birdObservations.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center text-yellow-800 mb-1">
                <FaBinoculars className="mr-2" />
                <span className="font-medium">Vogelwaarnemingen in de buurt</span>
              </div>
              <p className="text-sm text-yellow-700">
                Er zijn {birdObservations.length} recente vogelwaarnemingen in een straal van {radius} km.
              </p>
            </div>
          )}
          
          {birdError && (
            <div className="mb-4 text-sm text-red-600">
              {birdError}
            </div>
          )}
          
          <button
            onClick={() => handleStartWalk()}
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wandeling starten...
              </>
            ) : (
              'Start wandeling'
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Tips voor je wandeling</h2>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>Zorg dat je telefoon voldoende is opgeladen</li>
          <li>Neem water mee, vooral bij warm weer</li>
          <li>Draag comfortabele schoenen die geschikt zijn voor het terrein</li>
          <li>Gebruik de spraakfunctie om observaties toe te voegen tijdens je wandeling</li>
          <li>Kijk goed om je heen naar vogels en andere dieren</li>
        </ul>
      </div>
    </div>
  );
};

export default NewWalkPage; 
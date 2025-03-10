import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVoice } from '../context/VoiceContext';
import { 
  getWalk, 
  updateWalk, 
  endWalk, 
  addObservation, 
  getWalkObservations,
  addPhotoToObservation
} from '../services/firestoreService';
import { 
  startLocationTracking, 
  stopLocationTracking, 
  calculateRouteDistance 
} from '../services/locationService';
import { getWeatherData } from '../services/weatherService';
import {
  isOnline,
  saveOfflineWalk,
  saveOfflineObservation,
  updateOfflineWalk,
  endOfflineWalk,
  getOfflineWalk,
  getOfflineObservations
} from '../services/offlineService';
import MapComponent from '../components/MapComponent';
import WeatherDisplay from '../components/WeatherDisplay';
import VoiceButton from '../components/VoiceButton';
import ObservationItem from '../components/ObservationItem';
import OfflineIndicator from '../components/OfflineIndicator';

/**
 * Pagina voor een actieve wandeling
 */
const ActiveWalkPage = () => {
  const { walkId } = useParams();
  const { currentUser } = useAuth();
  const { processCommand } = useVoice();
  const navigate = useNavigate();
  
  const [walk, setWalk] = useState(null);
  const [observations, setObservations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pathPoints, setPathPoints] = useState([]);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [distance, setDistance] = useState(0);
  const [isRecordingObservation, setIsRecordingObservation] = useState(false);
  const [observationCategory, setObservationCategory] = useState('algemeen');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!isOnline());
  
  const watchIdRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastObservationIdRef = useRef(null);

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

  // Haal wandelgegevens op
  useEffect(() => {
    const fetchWalkData = async () => {
      if (!walkId) return;
      
      try {
        let walkData;
        let observationsData = [];

        if (isOffline) {
          console.log('Offline modus: wandelgegevens ophalen uit lokale opslag');
          walkData = getOfflineWalk(walkId);
          if (walkData) {
            observationsData = getOfflineObservations(walkId);
          }
        } else {
          console.log('Online modus: wandelgegevens ophalen uit Firestore');
          walkData = await getWalk(walkId);
          if (walkData) {
            observationsData = await getWalkObservations(walkId);
          }
        }

        if (!walkData) {
          setError('Wandeling niet gevonden');
          return;
        }
        
        setWalk(walkData);
        setObservations(observationsData);
        
        // Zet initiële pathPoints
        if (walkData.pathPoints && walkData.pathPoints.length > 0) {
          const points = walkData.pathPoints.map(point => [point.lat, point.lng]);
          setPathPoints(points);
          
          // Bereken afstand
          const calculatedDistance = calculateRouteDistance(points);
          setDistance(calculatedDistance);
        }
      } catch (error) {
        console.error('Fout bij het ophalen van wandelgegevens:', error);
        setError('Kon wandelgegevens niet laden');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalkData();
  }, [walkId, isOffline]);

  // Start locatie tracking
  useEffect(() => {
    if (!walkId) return;
    
    const startTracking = () => {
      try {
        const watchId = startLocationTracking((location) => {
          const newLocation = [location.lat, location.lng];
          setCurrentLocation(newLocation);
          
          // Update pathPoints
          setPathPoints(prev => {
            if (prev.length === 0) {
              return [newLocation];
            }
            
            // Controleer of de nieuwe locatie significant verschilt van de vorige
            const lastPoint = prev[prev.length - 1];
            const latDiff = Math.abs(lastPoint[0] - newLocation[0]);
            const lngDiff = Math.abs(lastPoint[1] - newLocation[1]);
            
            // Alleen toevoegen als de locatie significant is veranderd
            if (latDiff > 0.00001 || lngDiff > 0.00001) {
              const newPoints = [...prev, newLocation];
              
              // Update de wandeling in Firestore of lokale opslag
              updateWalkPath(newPoints);
              
              // Bereken afstand
              const calculatedDistance = calculateRouteDistance(newPoints);
              setDistance(calculatedDistance);
              
              return newPoints;
            }
            
            return prev;
          });
        });
        
        watchIdRef.current = watchId;
      } catch (error) {
        console.error('Fout bij het starten van locatie tracking:', error);
        setError('Kon locatie tracking niet starten');
      }
    };
    
    startTracking();
    
    // Haal weergegevens op als we online zijn
    if (!isOffline) {
      fetchWeatherData();
    }
    
    // Cleanup functie
    return () => {
      if (watchIdRef.current) {
        stopLocationTracking(watchIdRef.current);
      }
    };
  }, [walkId, isOffline]);

  // Haal weergegevens op
  const fetchWeatherData = async () => {
    if (!currentLocation || isOffline) return;
    
    try {
      const weatherData = await getWeatherData(currentLocation[0], currentLocation[1]);
      setCurrentWeather(weatherData);
    } catch (error) {
      console.error('Fout bij het ophalen van weergegevens:', error);
    }
  };

  // Update wandelpad in Firestore of lokale opslag
  const updateWalkPath = async (points) => {
    if (!walkId) return;
    
    try {
      const pathPointsData = points.map(point => ({ lat: point[0], lng: point[1] }));
      
      if (isOffline) {
        console.log('Offline modus: wandelpad updaten in lokale opslag');
        updateOfflineWalk(walkId, { pathPoints: pathPointsData });
      } else {
        console.log('Online modus: wandelpad updaten in Firestore');
        await updateWalk(walkId, { pathPoints: pathPointsData });
      }
    } catch (error) {
      console.error('Fout bij het updaten van wandelpad:', error);
    }
  };

  // Beëindig de wandeling
  const handleEndWalk = async () => {
    if (!walkId || !currentLocation) return;
    
    try {
      setLoading(true);
      
      // Stop locatie tracking
      if (watchIdRef.current) {
        stopLocationTracking(watchIdRef.current);
      }
      
      const endLocationData = { lat: currentLocation[0], lng: currentLocation[1] };
      
      if (isOffline) {
        console.log('Offline modus: wandeling beëindigen in lokale opslag');
        endOfflineWalk(walkId, endLocationData, distance);
      } else {
        console.log('Online modus: wandeling beëindigen in Firestore');
        await endWalk(walkId, endLocationData, distance);
      }
      
      // Navigeer naar de samenvatting
      navigate(`/walk-summary/${walkId}`);
    } catch (error) {
      console.error('Fout bij het beëindigen van wandeling:', error);
      setError('Kon wandeling niet beëindigen');
      setLoading(false);
    }
  };

  // Start observatie opname
  const handleStartObservation = (category = 'algemeen') => {
    setObservationCategory(category);
    setIsRecordingObservation(true);
  };

  // Verwerk spraakcommando's
  const handleVoiceCommand = async (text) => {
    if (!text) {
      console.error('Geen tekst ontvangen van spraakherkenning');
      return;
    }
    
    console.log('Ontvangen spraakcommando:', text);
    
    if (isRecordingObservation) {
      // Als we een observatie aan het opnemen zijn, sla deze op
      console.log('Observatie opslaan:', text, observationCategory);
      const observationId = await saveObservation(text, observationCategory);
      
      if (observationId) {
        console.log('Observatie succesvol opgeslagen met ID:', observationId);
      } else {
        console.error('Fout bij het opslaan van observatie');
      }
      
      setIsRecordingObservation(false);
    } else {
      // Anders, verwerk als commando
      const command = processCommand(text);
      console.log('Verwerkt commando:', command);
      
      if (command) {
        switch (command.type) {
          case 'NEW_OBSERVATION':
            console.log('Nieuwe observatie starten');
            handleStartObservation();
            break;
          case 'END_WALK':
            console.log('Wandeling beëindigen');
            handleEndWalk();
            break;
          case 'STOP_LISTENING':
            console.log('Stoppen met luisteren');
            // Geen actie nodig, de VoiceButton component handelt dit af
            break;
          case 'TEXT':
            // Als het geen specifiek commando is, behandel als observatie
            console.log('Tekst als observatie behandelen:', command.text);
            await saveObservation(command.text);
            break;
          default:
            // Geen actie voor andere commando's
            console.log('Geen actie voor commando type:', command.type);
            break;
        }
      }
    }
  };

  // Sla een observatie op
  const saveObservation = async (text, category = 'algemeen') => {
    if (!text) {
      console.error('Geen tekst om op te slaan');
      return null;
    }
    
    if (!walkId) {
      console.error('Geen walkId beschikbaar');
      return null;
    }
    
    if (!currentUser) {
      console.error('Geen gebruiker ingelogd');
      return null;
    }
    
    if (!currentLocation) {
      console.error('Geen locatie beschikbaar');
      return null;
    }
    
    console.log(`Observatie opslaan: "${text}" in categorie "${category}"`);
    
    try {
      const locationData = { lat: currentLocation[0], lng: currentLocation[1] };
      let observationId;
      
      if (isOffline) {
        console.log('Offline modus: observatie opslaan in lokale opslag');
        observationId = saveOfflineObservation({
          walkId,
          userId: currentUser.uid,
          text,
          location: locationData,
          category,
          weatherAtPoint: currentWeather,
          timestamp: new Date().toISOString()
        });
        
        // Haal observaties opnieuw op uit lokale opslag
        const offlineObservations = getOfflineObservations(walkId);
        setObservations(offlineObservations);
      } else {
        console.log('Online modus: observatie opslaan in Firestore');
        observationId = await addObservation(
          walkId,
          currentUser.uid,
          text,
          locationData,
          category,
          currentWeather
        );
        
        // Haal observaties opnieuw op uit Firestore
        const observationsData = await getWalkObservations(walkId);
        setObservations(observationsData);
      }
      
      console.log('Observatie opgeslagen met ID:', observationId);
      
      // Sla het observatie-ID op voor het geval we een foto willen toevoegen
      lastObservationIdRef.current = observationId;
      
      return observationId;
    } catch (error) {
      console.error('Fout bij het opslaan van observatie:', error);
      setError('Kon observatie niet opslaan');
      return null;
    }
  };

  // Voeg een foto toe aan de laatste observatie
  const handleAddPhoto = () => {
    if (isOffline) {
      setError('Foto\'s toevoegen is niet beschikbaar in offline modus');
      return;
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Verwerk foto upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !lastObservationIdRef.current || isOffline) return;
    
    try {
      setLoading(true);
      await addPhotoToObservation(lastObservationIdRef.current, file);
      
      // Haal observaties opnieuw op
      const observationsData = await getWalkObservations(walkId);
      setObservations(observationsData);
    } catch (error) {
      console.error('Fout bij het uploaden van foto:', error);
      setError('Kon foto niet uploaden');
    } finally {
      setLoading(false);
    }
  };

  // Selecteer een categorie voor de observatie
  const handleCategorySelect = (category) => {
    setObservationCategory(category);
    handleStartObservation(category);
  };

  if (loading && !walk) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-gray-600">Wandeling laden...</span>
      </div>
    );
  }

  if (error && !walk) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
        >
          Terug naar dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {walk?.title || 'Wandeling'}
          </h1>
          <p className="text-sm text-gray-600">
            {formatDuration(duration)}
            {distance > 0 && ` • ${formatDistance(distance)}`}
          </p>
        </div>
        
        {currentWeather && (
          <div className="self-end sm:self-auto">
            <WeatherDisplay weather={currentWeather} size="medium" />
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {isOffline && <OfflineIndicator className="mb-4" />}
      
      {/* Kaart */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-64 sm:h-80">
          <MapComponent 
            center={currentLocation} 
            pathPoints={pathPoints}
            observations={observations}
            zoom={15}
          />
        </div>
      </div>
      
      {/* Observaties */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Observaties</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => handleStartObservation('plant')}
              className="bg-green-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-green-700 transition-colors"
            >
              Plant
            </button>
            <button
              onClick={() => handleStartObservation('dier')}
              className="bg-amber-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-amber-700 transition-colors"
            >
              Dier
            </button>
            <button
              onClick={() => handleStartObservation('algemeen')}
              className="bg-primary-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-primary-700 transition-colors"
            >
              Algemeen
            </button>
          </div>
        </div>
        
        {isRecordingObservation && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-primary-800">
                Spreek je observatie in
              </p>
              <p className="text-sm text-primary-600">
                Categorie: {observationCategory}
              </p>
            </div>
            <VoiceButton 
              onResult={handleVoiceCommand}
              color="primary"
              size="medium"
              label="Spreek"
              stopLabel="Stop"
              listeningLabel="Luisteren..."
              autoStop={true}
              autoStopTime={10000}
            />
          </div>
        )}
        
        {observations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600">
              Nog geen observaties. Gebruik de knoppen hierboven of de spraakknop om observaties toe te voegen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {observations.map(observation => (
              <ObservationItem 
                key={observation.id} 
                observation={observation} 
                onAddPhoto={(file) => handleAddPhoto(observation.id, file)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Acties */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <button
          onClick={handleEndWalk}
          disabled={loading}
          className="w-full sm:w-auto bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Bezig...' : 'Beëindig wandeling'}
        </button>
      </div>
      
      {/* Spraakcommando knop */}
      <div className="fixed bottom-20 right-4 z-30">
        <VoiceButton 
          onResult={handleVoiceCommand}
          label="Observatie"
          stopLabel="Stop"
          listeningLabel="Luisteren..."
          autoStop={true}
          autoStopTime={8000}
        />
      </div>
    </div>
  );
};

export default ActiveWalkPage; 
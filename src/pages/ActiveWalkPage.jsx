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
    <div className="flex flex-col h-full">
      {/* Offline indicator */}
      <OfflineIndicator />
      
      {/* Offline waarschuwing */}
      {isOffline && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Je bent offline. Wandelgegevens worden lokaal opgeslagen en gesynchroniseerd wanneer je weer online bent.</p>
          </div>
        </div>
      )}
      
      {/* Kaart sectie */}
      <div className="h-1/2 mb-4">
        <MapComponent 
          currentLocation={currentLocation}
          pathPoints={pathPoints}
          observations={observations}
          height="100%"
          offlineMode={isOffline}
        />
      </div>
      
      {/* Wandelinformatie */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{walk?.name || 'Actieve wandeling'}</h1>
            <p className="text-sm text-gray-600">
              Afstand: {(distance / 1000).toFixed(2)} km • 
              Observaties: {observations.length}
            </p>
          </div>
          
          {currentWeather && (
            <WeatherDisplay weather={currentWeather} size="medium" />
          )}
        </div>
      </div>
      
      {/* Observatie knoppen */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Voeg een observatie toe</h2>
        
        {isRecordingObservation ? (
          <div className="bg-blue-50 p-3 rounded-lg mb-3 animate-pulse">
            <p className="text-blue-800 font-medium">Luisteren naar observatie...</p>
            <p className="text-sm text-blue-600 mt-1">Categorie: {observationCategory}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => handleCategorySelect('algemeen')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Algemeen
            </button>
            <button
              onClick={() => handleCategorySelect('vogels')}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Vogels
            </button>
            <button
              onClick={() => handleCategorySelect('planten')}
              className="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Planten
            </button>
            <button
              onClick={() => handleCategorySelect('dieren')}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Dieren
            </button>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <VoiceButton 
            onResult={handleVoiceCommand}
            label="Observatie"
            listeningLabel="Luisteren..."
            color="success"
            size="medium"
            disabled={isRecordingObservation}
          />
          
          <div className="flex space-x-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <button
              onClick={handleAddPhoto}
              disabled={!lastObservationIdRef.current || isOffline}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              title={isOffline ? "Foto's toevoegen is niet beschikbaar in offline modus" : "Voeg een foto toe aan de laatste observatie"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button
              onClick={handleEndWalk}
              className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Observaties lijst */}
      <div className="flex-grow overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Observaties</h2>
        
        {observations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600">Nog geen observaties. Voeg je eerste observatie toe!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {observations.map(observation => (
              <ObservationItem 
                key={observation.id} 
                observation={observation} 
                onClick={() => {}} 
                isOffline={observation.pendingSync}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveWalkPage; 
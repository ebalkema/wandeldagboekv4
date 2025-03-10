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
  calculateRouteDistance,
  formatDistance,
  checkLocationAvailability
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
import { formatDuration } from '../utils/dateUtils';

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
  const [isOffline, setIsOffline] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const watchIdRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastObservationIdRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // Controleer online/offline status
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      const online = navigator.onLine;
      setIsOffline(!online);
      console.log(`App is ${online ? 'online' : 'offline'}`);
    };
    
    // Initiële status
    handleOnlineStatusChange();
    
    // Event listeners
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
      if (!walkId || !currentUser) return;
      
      try {
        setLoading(true);
        
        let walkData;
        let observationsData = [];
        
        if (isOffline) {
          console.log('Offline modus: wandelgegevens ophalen uit lokale opslag');
          walkData = await getOfflineWalk(walkId);
          observationsData = await getOfflineObservations(walkId);
        } else {
          console.log('Online modus: wandelgegevens ophalen uit Firestore');
          walkData = await getWalk(walkId);
          
          if (walkData) {
            try {
              observationsData = await getWalkObservations(walkId);
            } catch (error) {
              console.error('Fout bij het ophalen van observaties:', error);
            }
          }
        }
        
        if (!walkData) {
          setError('Wandeling niet gevonden');
          return;
        }
        
        // Controleer of de wandeling van de huidige gebruiker is
        if (walkData.userId !== currentUser.uid) {
          setError('Je hebt geen toegang tot deze wandeling');
          return;
        }
        
        setWalk(walkData);
        setObservations(observationsData);
        
        // Zet pathPoints
        if (walkData.pathPoints && walkData.pathPoints.length > 0) {
          setPathPoints(walkData.pathPoints);
        }
        
        // Start duur timer
        if (!walkData.endTime) {
          startDurationTimer(walkData.startTime);
        }
      } catch (error) {
        console.error('Fout bij het ophalen van wandelgegevens:', error);
        setError('Kon wandelgegevens niet laden');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalkData();
  }, [walkId, currentUser, isOffline]);

  // Start duur timer
  const startDurationTimer = (startTime) => {
    // Bereken initiële duur
    const start = startTime?.seconds 
      ? new Date(startTime.seconds * 1000) 
      : new Date(startTime);
    
    const updateDuration = () => {
      const now = new Date();
      const durationInMinutes = Math.floor((now - start) / (1000 * 60));
      setDuration(durationInMinutes);
    };
    
    // Update direct en daarna elke minuut
    updateDuration();
    durationIntervalRef.current = setInterval(updateDuration, 60000);
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  };

  // Cleanup duur timer
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Callback voor succesvolle locatie updates
  const handleLocationUpdate = (location) => {
    const newLocation = [location.lat, location.lng];
    setCurrentLocation(newLocation);
    
    // Als dit een fallback locatie is, toon een waarschuwing
    if (location.isDefault && !error) {
      setError('Locatie niet beschikbaar. Gebruik een apparaat met GPS voor nauwkeurige tracking.');
    } else if (error && !location.isDefault) {
      // Als we weer een echte locatie hebben, verwijder de foutmelding
      setError('');
    }
    
    // Update pathPoints
    setPathPoints(prev => {
      if (prev.length === 0) {
        // Eerste punt met timestamp
        const pointWithTimestamp = {
          lat: newLocation[0],
          lng: newLocation[1],
          timestamp: new Date().toISOString()
        };
        
        // Update de wandeling in Firestore of lokale opslag
        updateWalkPath([pointWithTimestamp]);
        
        return [pointWithTimestamp];
      }
      
      // Controleer of de nieuwe locatie significant verschilt van de vorige
      const lastPoint = prev[prev.length - 1];
      const lastLat = lastPoint.lat || lastPoint[0];
      const lastLng = lastPoint.lng || lastPoint[1];
      const latDiff = Math.abs(lastLat - newLocation[0]);
      const lngDiff = Math.abs(lastLng - newLocation[1]);
      
      // Alleen toevoegen als de locatie significant is veranderd
      if (latDiff > 0.00001 || lngDiff > 0.00001) {
        // Nieuw punt met timestamp
        const pointWithTimestamp = {
          lat: newLocation[0],
          lng: newLocation[1],
          timestamp: new Date().toISOString()
        };
        
        const newPoints = [...prev, pointWithTimestamp];
        
        // Update de wandeling in Firestore of lokale opslag
        updateWalkPath(newPoints);
        
        // Bereken afstand
        const calculatedDistance = calculateRouteDistance(
          newPoints.map(p => [p.lat || p[0], p.lng || p[1]])
        );
        setDistance(calculatedDistance);
        
        return newPoints;
      }
      
      return prev;
    });
  };

  // Callback voor locatiefouten
  const handleLocationError = (error, consecutiveErrors) => {
    // Callback voor locatiefouten
    console.error('Locatiefout in ActiveWalkPage:', error.message);
    
    // Toon alleen een foutmelding als er meerdere fouten achter elkaar zijn
    if (consecutiveErrors >= 3) {
      setError(`Locatieproblemen: ${error.message}. Probeer naar buiten te gaan of controleer je locatietoestemming.`);
    }
  };

  // Start locatie tracking
  useEffect(() => {
    if (!walkId) return;
    
    const startTracking = () => {
      try {
        const watchId = startLocationTracking(
          handleLocationUpdate,
          handleLocationError
        );
        
        watchIdRef.current = watchId;
      } catch (error) {
        console.error('Fout bij het starten van locatie tracking:', error);
        setError('Kon locatie tracking niet starten. Controleer of je locatietoestemming hebt gegeven.');
      }
    };
    
    // Controleer eerst of locatieservices beschikbaar zijn
    checkLocationAvailability().then(available => {
      if (available) {
        startTracking();
      } else {
        setError('Locatieservices zijn niet beschikbaar. Controleer je browserinstellingen en geef toestemming voor locatietoegang.');
      }
    });
    
    // Haal weergegevens op als we online zijn
    if (!isOffline) {
      fetchWeatherData();
    }
    
    // Cleanup functie
    return () => {
      if (watchIdRef.current) {
        stopLocationTracking(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [walkId, isOffline]);

  // Haal weergegevens op
  const fetchWeatherData = async () => {
    if (!currentLocation) return;
    
    try {
      const weatherData = await getWeatherData(currentLocation[0], currentLocation[1]);
      setCurrentWeather(weatherData);
    } catch (error) {
      console.error('Fout bij het ophalen van weergegevens:', error);
    }
  };

  // Update het wandelpad in Firestore of lokale opslag
  const updateWalkPath = async (points) => {
    if (!walkId) return;
    
    try {
      // Zorg ervoor dat alle punten het juiste formaat hebben
      const pathPointsData = points.map(point => {
        if (Array.isArray(point)) {
          return { 
            lat: point[0], 
            lng: point[1],
            timestamp: new Date().toISOString()
          };
        }
        return point;
      });
      
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
    if (!walkId || !currentUser || !currentLocation) {
      console.error('Kan observatie niet opslaan: ontbrekende gegevens');
      return null;
    }
    
    try {
      const locationData = { lat: currentLocation[0], lng: currentLocation[1] };
      let observationId;
      
      if (isOffline) {
        console.log('Offline modus: observatie opslaan in lokale opslag');
        observationId = await saveOfflineObservation(
          walkId,
          currentUser.uid,
          text,
          locationData,
          category,
          currentWeather
        );
        
        // Voeg de observatie toe aan de lokale state
        const newObservation = {
          id: observationId,
          walkId,
          userId: currentUser.uid,
          text,
          location: locationData,
          category,
          timestamp: new Date().toISOString(),
          weatherAtPoint: currentWeather,
          pendingSync: true
        };
        
        setObservations(prev => [...prev, newObservation]);
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
        
        // Voeg de observatie toe aan de lokale state
        const newObservation = {
          id: observationId,
          walkId,
          userId: currentUser.uid,
          text,
          location: locationData,
          category,
          timestamp: new Date(),
          weatherAtPoint: currentWeather
        };
        
        setObservations(prev => [...prev, newObservation]);
      }
      
      // Sla het laatste observatie ID op voor het toevoegen van foto's
      lastObservationIdRef.current = observationId;
      
      return observationId;
    } catch (error) {
      console.error('Fout bij het opslaan van observatie:', error);
      return null;
    }
  };

  // Voeg een foto toe aan een observatie
  const handleAddPhoto = (observationId, file) => {
    if (!file) {
      fileInputRef.current.click();
      lastObservationIdRef.current = observationId;
    } else {
      handleFileUpload(observationId, file);
    }
  };

  // Verwerk bestandsupload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const observationId = lastObservationIdRef.current;
    if (!observationId) {
      console.error('Geen observatie ID beschikbaar voor foto upload');
      return;
    }
    
    await handleFileUpload(observationId, file);
  };

  // Upload bestand naar Firebase Storage
  const handleFileUpload = async (observationId, file) => {
    if (isOffline) {
      alert('Foto\'s toevoegen is niet beschikbaar in offline modus');
      return;
    }
    
    try {
      setLoading(true);
      await addPhotoToObservation(observationId, file);
      
      // Ververs observaties om de nieuwe foto te tonen
      const updatedObservations = await getWalkObservations(walkId);
      setObservations(updatedObservations);
      
      alert('Foto succesvol toegevoegd!');
    } catch (error) {
      console.error('Fout bij het uploaden van foto:', error);
      alert('Kon foto niet uploaden');
    } finally {
      setLoading(false);
    }
  };

  // Selecteer een categorie voor een observatie
  const handleCategorySelect = (category) => {
    handleStartObservation(category);
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {walk?.name || 'Wandeling'}
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
            pathPoints={pathPoints.map(p => [p.lat || p[0], p.lng || p[1]])}
            observations={observations}
            zoom={15}
          />
        </div>
        <div className="p-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-gray-500">Afstand:</span>
              <span className="ml-1 text-gray-800">{formatDistance(distance)}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Duur:</span>
              <span className="ml-1 text-gray-800">{formatDuration(duration)}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Observaties:</span>
              <span className="ml-1 text-gray-800">{observations.length}</span>
            </div>
          </div>
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
      
      {/* Verborgen bestandsinvoer voor foto's */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
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
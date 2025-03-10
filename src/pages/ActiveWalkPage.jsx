import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  checkLocationAvailability,
  updatePathPoints
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
import LazyMapComponent from '../components/LazyMapComponent';
import WeatherDisplay from '../components/WeatherDisplay';
import LazyVoiceButton from '../components/LazyVoiceButton';
import ObservationItem from '../components/ObservationItem';
import OfflineIndicator from '../components/OfflineIndicator';
import { formatDuration, formatTime } from '../utils/dateUtils';
import BirdObservations from '../components/BirdObservations';
import BiodiversityPanel from '../components/BiodiversityPanel';
import Header from '../components/Header';
import { FaPlus } from 'react-icons/fa';

/**
 * Pagina voor een actieve wandeling
 */
const ActiveWalkPage = () => {
  const { walkId } = useParams();
  const { currentUser, userSettings } = useAuth();
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
  const [manualObservationText, setManualObservationText] = useState('');
  const [consecutiveLocationErrors, setConsecutiveLocationErrors] = useState(0);
  
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
    // Zet de huidige locatie
    setCurrentLocation([location.lat, location.lng]);
    
    // Als dit een fallback locatie is, toon een waarschuwing
    if (location.isDefault && !error) {
      setError('Locatie niet beschikbaar. Gebruik een apparaat met GPS voor nauwkeurige tracking.');
    } else if (error && !location.isDefault) {
      // Als we weer een echte locatie hebben, verwijder de foutmelding
      setError('');
    }
    
    // Update het pad en de afstand
    setPathPoints(prevPoints => {
      const updatedPoints = updatePathPoints(prevPoints, location);
      
      // Als er een nieuw punt is toegevoegd, update de afstand en de wandeling in de database
      if (updatedPoints.length > prevPoints.length) {
        // Bereken de afstand
        const newDistance = calculateRouteDistance(updatedPoints);
        setDistance(newDistance);
        
        // Update de wandeling in de database
        updateWalkPath([location.lat, location.lng]);
      }
      
      return updatedPoints;
    });
    
    // Reset de teller voor opeenvolgende fouten
    setConsecutiveLocationErrors(0);
  };

  // Callback voor locatiefouten
  const handleLocationError = (error, consecutiveErrors) => {
    console.error('Locatiefout in ActiveWalkPage:', error.message);
    
    // Verhoog de teller voor opeenvolgende fouten
    setConsecutiveLocationErrors(prev => prev + 1);
    
    // Toon alleen een foutmelding als er meerdere fouten achter elkaar zijn
    if (consecutiveLocationErrors >= 3) {
      setError(`Locatieproblemen: ${error.message}. Probeer naar buiten te gaan of controleer je locatietoestemming.`);
      
      // Als er te veel opeenvolgende fouten zijn, gebruik de laatste bekende locatie
      if (consecutiveLocationErrors >= 5 && pathPoints.length > 0) {
        const lastPoint = pathPoints[pathPoints.length - 1];
        if (Array.isArray(lastPoint) && lastPoint.length === 2) {
          console.log('Gebruik laatste bekende locatie vanwege aanhoudende locatieproblemen');
          setCurrentLocation(lastPoint);
        }
      }
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

  // Update het wandelpad in de database
  const updateWalkPath = async (newPoint) => {
    if (!walkId || !currentUser) return;
    
    try {
      // Voeg het nieuwe punt toe aan het pad
      const updatedPathPoints = updatePathPoints(pathPoints, { 
        lat: newPoint[0], 
        lng: newPoint[1] 
      });
      
      // Alleen updaten als er daadwerkelijk een nieuw punt is toegevoegd
      if (updatedPathPoints.length > pathPoints.length) {
        console.log('Online modus: wandelpad updaten in Firestore');
        
        // Bereken de afstand
        const calculatedDistance = calculateRouteDistance(updatedPathPoints);
        
        // Converteer de array van arrays naar een array van objecten voor Firestore
        // Firestore ondersteunt geen geneste arrays
        const pathPointsForFirestore = updatedPathPoints.map((point, index) => ({
          lat: point[0],
          lng: point[1],
          index: index, // Index toevoegen voor sortering
          timestamp: new Date().toISOString()
        }));
        
        // Update de wandeling in de database
        if (isOffline) {
          updateOfflineWalk(walkId, {
            pathPoints: pathPointsForFirestore,
            distance: calculatedDistance
          });
        } else {
          await updateWalk(walkId, {
            pathPoints: pathPointsForFirestore,
            distance: calculatedDistance
          });
        }
        
        // Update de lokale state
        setPathPoints(updatedPathPoints);
        setDistance(calculatedDistance);
      }
    } catch (error) {
      console.error('Fout bij het updaten van wandelpad:', error);
    }
  };

  // Beëindig de wandeling
  const handleEndWalk = async () => {
    if (!walkId) {
      setError('Geen wandeling ID gevonden');
      return;
    }
    
    // Als er geen currentLocation is, gebruik een fallback locatie
    const endLocationData = currentLocation 
      ? { lat: currentLocation[0], lng: currentLocation[1] }
      : { lat: 52.3676, lng: 4.9041 }; // Amsterdam als fallback
    
    try {
      setLoading(true);
      
      // Stop locatie tracking
      if (watchIdRef.current) {
        stopLocationTracking(watchIdRef.current);
      }
      
      console.log(`Wandeling beëindigen met ID: ${walkId}, locatie:`, endLocationData, 'afstand:', distance);
      
      // Converteer het volledige pad naar objecten voor Firestore
      const pathPointsForFirestore = pathPoints.map((point, index) => {
        // Controleer of het punt al een object is
        if (typeof point === 'object' && !Array.isArray(point) && point !== null) {
          return {
            ...point,
            index: index
          };
        }
        
        // Anders, converteer van array naar object
        return {
          lat: point[0],
          lng: point[1],
          index: index,
          timestamp: new Date().toISOString()
        };
      });
      
      if (isOffline) {
        console.log('Offline modus: wandeling beëindigen in lokale opslag');
        endOfflineWalk(walkId, endLocationData, distance, pathPointsForFirestore);
      } else {
        console.log('Online modus: wandeling beëindigen in Firestore');
        await endWalk(walkId, endLocationData, distance, pathPointsForFirestore);
      }
      
      // Toon een bevestiging
      alert('Wandeling succesvol beëindigd!');
      
      // Navigeer naar de samenvatting
      navigate(`/walk/${walkId}`);
    } catch (error) {
      console.error('Fout bij het beëindigen van wandeling:', error);
      setError(`Kon wandeling niet beëindigen: ${error.message}`);
      setLoading(false);
    }
  };

  // Start observatie opname
  const handleStartObservation = () => {
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
        
        // Voeg de nieuwe observatie toe aan de state, maar voorkom duplicaten
        setObservations(prev => {
          // Controleer of deze observatie al bestaat
          const exists = prev.some(obs => obs.id === observationId);
          if (exists) {
            return prev;
          }
          return [...prev, newObservation];
        });
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
        
        // Haal alle observaties opnieuw op om zeker te zijn dat we de meest recente data hebben
        const updatedObservations = await getWalkObservations(walkId);
        setObservations(updatedObservations);
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
    handleStartObservation();
  };

  // Functie om een observatie te selecteren op de kaart
  const handleObservationClick = (observationId) => {
    const observation = observations.find(obs => obs.id === observationId);
    if (observation) {
      // Scroll naar de observatie in de lijst
      const element = document.getElementById(`observation-${observationId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight de observatie tijdelijk
        element.classList.add('bg-primary-50');
        setTimeout(() => {
          element.classList.remove('bg-primary-50');
        }, 1500);
      }
    }
  };

  return (
    <div className="pb-20">
      {/* Aangepaste Header voor actieve wandeling */}
      <Header onAddObservation={handleStartObservation} />
      
      {/* Header met wandelinformatie */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 mt-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{walk?.name || 'Actieve wandeling'}</h1>
            <p className="text-sm text-gray-500">
              {walk?.startTime ? formatTime(walk.startTime) : '--:--'} - {walk?.endTime ? formatTime(walk.endTime) : '--:--'}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Afstand</p>
            <p className="text-lg font-bold text-primary-600">
              {formatDistance(distance)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Kaart */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-64 sm:h-80">
          <LazyMapComponent 
            center={currentLocation} 
            pathPoints={pathPoints.map(p => [p.lat || p[0], p.lng || p[1]])}
            observations={observations}
            onObservationClick={handleObservationClick}
          />
        </div>
      </div>
      
      {/* Biodiversiteit Panel */}
      {currentLocation && (
        <BiodiversityPanel 
          location={currentLocation} 
          radius={1000} // 1 km radius
        />
      )}
      
      {/* Weer informatie */}
      {currentWeather && (
        <WeatherDisplay weather={currentWeather} iconSize="lg" />
      )}
      
      {/* Weer en statistieken */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Weer</h2>
          {currentWeather ? (
            <div className="flex items-center">
              <WeatherDisplay weather={currentWeather} iconSize="lg" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">Temperatuur</p>
                <p className="text-xl font-bold text-primary-600">
                  {currentWeather.temperature}°C
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Weergegevens laden...</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Statistieken</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Duur</p>
              <p className="text-xl font-bold text-primary-600">
                {formatDuration(duration)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Observaties</p>
              <p className="text-xl font-bold text-primary-600">
                {observations.length}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Observaties */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Observaties</h2>
          <button 
            onClick={handleStartObservation}
            className="bg-primary-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-primary-700 transition-colors flex items-center"
          >
            <FaPlus className="mr-1" />
            Nieuwe observatie
          </button>
        </div>
        
        {isRecordingObservation && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-primary-800">Nieuwe observatie</h3>
              <div className="flex space-x-2">
                <select
                  value={observationCategory}
                  onChange={(e) => setObservationCategory(e.target.value)}
                  className="text-sm border-gray-300 rounded-md"
                >
                  <option value="algemeen">Algemeen</option>
                  <option value="plant">Plant</option>
                  <option value="dier">Dier</option>
                  <option value="vogel">Vogel</option>
                  <option value="insect">Insect</option>
                  <option value="landschap">Landschap</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-primary-700 mb-2">
              Spreek je observatie in of typ deze hieronder:
            </p>
            <div className="flex items-center">
              <LazyVoiceButton 
                onResult={handleVoiceCommand}
                color="primary"
                size="sm"
                className="mr-2"
              />
              <input
                type="text"
                placeholder="Typ je observatie..."
                className="flex-1 border-gray-300 rounded-md text-sm"
                value={manualObservationText}
                onChange={(e) => setManualObservationText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualObservationText.trim()) {
                    saveObservation(manualObservationText, observationCategory);
                    setManualObservationText('');
                    setIsRecordingObservation(false);
                  }
                }}
              />
            </div>
          </div>
        )}
        
        {observations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nog geen observaties. Gebruik de knop hierboven of de spraakknop om een observatie toe te voegen.
          </p>
        ) : (
          <div className="space-y-4">
            {observations.map(observation => (
              <ObservationItem 
                key={observation.id} 
                observation={observation}
                isOffline={isOffline}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Vogelwaarnemingen */}
      {currentLocation && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Vogelwaarnemingen in de buurt</h2>
            <span className="text-sm text-gray-500">
              Zoekradius: {userSettings?.birdRadius || 10} km
            </span>
          </div>
          <BirdObservations 
            location={{ lat: currentLocation[0], lng: currentLocation[1] }} 
            radius={userSettings?.birdRadius}
          />
        </div>
      )}
      
      {/* Beëindig wandeling knop */}
      <div className="fixed bottom-20 inset-x-0 p-4 bg-white border-t border-gray-200 flex justify-center z-20">
        <button
          onClick={handleEndWalk}
          className="bg-red-600 text-white py-3 px-8 rounded-lg hover:bg-red-700 transition-colors font-bold text-lg shadow-lg flex items-center"
          disabled={loading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {loading ? 'Bezig...' : 'Wandeling beëindigen'}
        </button>
      </div>
      
      {/* Offline indicator */}
      {isOffline && <OfflineIndicator />}
    </div>
  );
};

export default ActiveWalkPage; 
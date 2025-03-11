import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  calculateDistance,
  calculateRouteDistance,
  formatDistance,
  checkLocationPermission,
  requestLocationPermission,
  isBrowserLocationSupported
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
import { FaPlus, FaBinoculars } from 'react-icons/fa';
import { compressImage, createThumbnail } from '../utils/imageUtils';

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
  const [observationText, setObservationText] = useState('');
  const [observationCategory, setObservationCategory] = useState('algemeen');
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [selectedBirdLocation, setSelectedBirdLocation] = useState(null);
  const [showBirdsOnMap, setShowBirdsOnMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [duration, setDuration] = useState(0);
  const [manualObservationText, setManualObservationText] = useState('');
  const [consecutiveLocationErrors, setConsecutiveLocationErrors] = useState(0);
  const [selectedBirdRadius, setSelectedBirdRadius] = useState(2);
  
  const watchIdRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastObservationIdRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // Observatie modal
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

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
    if (!location) return;
    
    // Log locatie voor debugging
    console.log('Locatie update ontvangen:', {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      isDefault: location.isDefault
    });
    
    // Sla de huidige locatie op
    setCurrentLocation(location);
    
    // Als dit een fallback locatie is, toon een waarschuwing
    if (location.isDefault && !hasShownLocationWarning) {
      setHasShownLocationWarning(true);
      alert('Je locatie kon niet worden bepaald. We gebruiken een standaardlocatie voor deze wandeling. Controleer je locatietoestemming en GPS-instellingen.');
      return;
    }
    
    // Voeg het punt toe aan het pad als het geen fallback locatie is
    if (!location.isDefault) {
      // Bereken de afstand tot het laatste punt
      const lastPoint = pathPoints.length > 0 ? pathPoints[pathPoints.length - 1] : null;
      
      // Controleer of dit een significante verplaatsing is (meer dan 5 meter)
      // of als er nog geen punten zijn, of als het meer dan 60 seconden geleden is
      const now = Date.now();
      const timeSinceLastUpdate = lastLocationUpdateTime ? now - lastLocationUpdateTime : Infinity;
      const isTimeToUpdate = timeSinceLastUpdate >= 60000; // 60 seconden (1 minuut)
      
      if (!lastPoint || 
          calculateDistance(lastPoint, location) > 5 || 
          isTimeToUpdate) {
        
        // Log dat we een nieuw punt toevoegen
        console.log('Nieuw punt toevoegen aan pad:', {
          reden: !lastPoint ? 'Eerste punt' : 
                 calculateDistance(lastPoint, location) > 5 ? 'Significante verplaatsing' : 
                 'Tijdsinterval (1 minuut)',
          tijd: new Date().toLocaleTimeString()
        });
        
        // Update het pad
        updateWalkPath(location);
        
        // Update de tijd van de laatste locatie-update
        setLastLocationUpdateTime(now);
      }
    }
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

  // Start de locatietracking
  const startTracking = () => {
    try {
      console.log('Locatietracking starten...');
      
      // Controleer of de browser locatieservices ondersteunt
      if (!isBrowserLocationSupported()) {
        setError('Je browser ondersteunt geen locatieservices. Gebruik een moderne browser met GPS-ondersteuning.');
        return;
      }
      
      // Initialiseer state variabelen
      setConsecutiveLocationErrors(0);
      setHasShownLocationWarning(false);
      setLastLocationUpdateTime(null);
      
      // Start de locatietracking met de nieuwe parameters
      // - Vraag expliciet om toestemming als deze eerder is geweigerd
      // - Gebruik een fallback locatie als de echte locatie niet beschikbaar is
      const watchInfo = startLocationTracking(
        handleLocationUpdate,
        handleLocationError,
        true, // useFallback
        true  // requestPermission
      );
      
      // Sla de watchInfo op om later de tracking te kunnen stoppen
      watchIdRef.current = watchInfo;
      
      console.log('Locatietracking gestart');
    } catch (error) {
      console.error('Fout bij het starten van locatietracking:', error);
      setError(`Kon locatietracking niet starten: ${error.message}`);
    }
  };

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

  /**
   * Update het wandelpad met een nieuw punt
   * @param {Object} newPoint - Het nieuwe locatiepunt
   */
  const updateWalkPath = async (newPoint) => {
    try {
      if (!walkId || !newPoint) return;
      
      // Voeg het nieuwe punt toe aan het pad
      const updatedPathPoints = [...pathPoints, newPoint];
      setPathPoints(updatedPathPoints);
      
      // Bereken de nieuwe afstand
      const newDistance = calculateRouteDistance(updatedPathPoints);
      setDistance(newDistance);
      
      // Converteer het punt naar het juiste formaat voor de database
      const pointForDb = {
        lat: newPoint.lat,
        lng: newPoint.lng,
        timestamp: newPoint.timestamp || Date.now()
      };
      
      // Update de wandeling in de database
      await updateWalk(walkId, {
        currentLocation: pointForDb,
        distance: newDistance,
        pathPoints: updatedPathPoints.map(point => ({
          lat: point.lat,
          lng: point.lng,
          timestamp: point.timestamp || Date.now()
        }))
      });
      
      console.log('Wandelpad bijgewerkt in database:', {
        punt: pointForDb,
        afstand: newDistance,
        aantalPunten: updatedPathPoints.length
      });
    } catch (error) {
      console.error('Fout bij het updaten van het wandelpad:', error);
      
      // Als we offline zijn, sla de update op voor later
      if (isOffline) {
        console.log('Offline modus: wandelpad update wordt opgeslagen voor later');
        setPendingUpdates(prev => [...prev, {
          type: 'PATH_UPDATE',
          data: {
            walkId,
            point: newPoint,
            timestamp: Date.now()
          }
        }]);
      }
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
    handleShowObservationModal();
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
    if (!walkId || !currentUser) {
      console.error('Kan observatie niet opslaan: ontbrekende gegevens (walkId of currentUser)');
      return null;
    }
    
    try {
      // Gebruik een fallback locatie als er geen huidige locatie is
      let locationData;
      if (!currentLocation) {
        console.warn('Geen huidige locatie beschikbaar, gebruik fallback locatie voor observatie');
        // Gebruik de startlocatie van de wandeling als fallback
        if (walk && walk.startLocation) {
          locationData = walk.startLocation;
          console.log('Gebruik startlocatie van wandeling als fallback:', locationData);
        } else {
          // Als er geen startlocatie is, gebruik Amsterdam als fallback
          locationData = { lat: 52.3676, lng: 4.9041 };
          console.log('Gebruik Amsterdam als fallback locatie:', locationData);
        }
      } else {
        locationData = { lat: currentLocation[0], lng: currentLocation[1] };
      }
      
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
      
      // Controleer of het bestand geldig is
      if (!file || !file.type.startsWith('image/')) {
        console.error('Ongeldig bestandstype:', file?.type);
        alert('Ongeldig bestandstype. Alleen afbeeldingen worden ondersteund.');
        setLoading(false);
        return;
      }
      
      // Detecteer iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Log bestandsinformatie voor debugging
      console.log('Bestandsinformatie vóór compressie:', {
        naam: file.name,
        type: file.type,
        grootte: `${(file.size / 1024).toFixed(2)} KB`,
        lastModified: new Date(file.lastModified).toISOString(),
        isIOS: isIOS
      });
      
      // Comprimeer de afbeelding voordat deze wordt geüpload
      console.log('Bezig met comprimeren van afbeelding...');
      let compressedFile;
      try {
        // Gebruik lagere kwaliteit en afmetingen voor iOS
        const compressOptions = {
          maxWidth: isIOS ? 1000 : 1200,
          maxHeight: isIOS ? 1000 : 1200,
          quality: isIOS ? 0.5 : 0.7
        };
        
        console.log('Compressie-opties:', compressOptions);
        
        compressedFile = await compressImage(file, compressOptions);
        
        console.log('Bestandsinformatie na compressie:', {
          naam: compressedFile.name,
          type: compressedFile.type,
          grootte: `${(compressedFile.size / 1024).toFixed(2)} KB`,
          compressieRatio: `${Math.round((compressedFile.size / file.size) * 100)}%`
        });
        
        // Extra controle voor iOS: als het bestand nog steeds te groot is
        if (isIOS && compressedFile.size > 2 * 1024 * 1024) {
          console.warn('Bestand is nog steeds te groot na compressie, probeer nogmaals met lagere kwaliteit');
          
          // Probeer nogmaals met nog lagere kwaliteit
          compressedFile = await compressImage(compressedFile, {
            maxWidth: 800,
            maxHeight: 800,
            quality: 0.3
          });
          
          console.log('Bestandsinformatie na extra compressie:', {
            naam: compressedFile.name,
            type: compressedFile.type,
            grootte: `${(compressedFile.size / 1024).toFixed(2)} KB`
          });
        }
      } catch (compressError) {
        console.error('Fout bij het comprimeren van afbeelding:', compressError);
        // Gebruik het originele bestand als compressie mislukt
        console.log('Gebruik origineel bestand omdat compressie is mislukt');
        compressedFile = file;
      }
      
      console.log('Bezig met uploaden van afbeelding naar Firebase Storage...');
      console.log('Upload voor observatie ID:', observationId);
      
      // Voeg een timeout toe om te voorkomen dat de upload vastloopt
      const uploadPromise = addPhotoToObservation(observationId, compressedFile);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout na 60 seconden')), 60000)
      );
      
      // Race tussen de upload en de timeout
      const downloadURL = await Promise.race([uploadPromise, timeoutPromise]);
      
      if (!downloadURL) {
        throw new Error('Geen download URL ontvangen na uploaden van foto');
      }
      
      console.log('Foto succesvol geüpload, download URL:', downloadURL);
      
      // Wacht even om ervoor te zorgen dat de database is bijgewerkt
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Ververs observaties om de nieuwe foto te tonen
      try {
        console.log('Observaties verversen na foto upload...');
        const updatedObservations = await getWalkObservations(walkId);
        
        // Log de ontvangen observaties voor debugging
        console.log('Bijgewerkte observaties na foto upload:', updatedObservations);
        
        // Controleer of de observatie met de nieuwe foto aanwezig is
        const updatedObservation = updatedObservations.find(obs => obs.id === observationId);
        if (updatedObservation) {
          console.log('Bijgewerkte observatie gevonden:', updatedObservation);
          console.log('MediaUrls in bijgewerkte observatie:', updatedObservation.mediaUrls);
        } else {
          console.warn('Bijgewerkte observatie niet gevonden in resultaten');
        }
        
        // Zorg ervoor dat de state wordt bijgewerkt met de nieuwe observaties
        setObservations(updatedObservations);
      } catch (refreshError) {
        console.error('Fout bij het verversen van observaties na foto upload:', refreshError);
        // Ga door, omdat de foto wel is geüpload
        
        // Probeer de observatie handmatig bij te werken in de huidige state
        try {
          const updatedObservations = [...observations];
          const observationIndex = updatedObservations.findIndex(obs => obs.id === observationId);
          
          if (observationIndex !== -1) {
            const observation = updatedObservations[observationIndex];
            const mediaUrls = observation.mediaUrls || [];
            updatedObservations[observationIndex] = {
              ...observation,
              mediaUrls: [...mediaUrls, downloadURL]
            };
            
            console.log('Observatie handmatig bijgewerkt in state:', updatedObservations[observationIndex]);
            setObservations(updatedObservations);
          }
        } catch (stateUpdateError) {
          console.error('Fout bij handmatige update van observatie in state:', stateUpdateError);
        }
      }
      
      // Reset de foto state
      setPhotoFile(null);
      setPhotoPreview(null);
      
      alert('Foto succesvol toegevoegd!');
    } catch (error) {
      console.error('Fout bij het uploaden van foto:', error);
      
      // Geef een gebruikersvriendelijke foutmelding
      let errorMessage = 'Kon foto niet uploaden';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Het uploaden van de foto duurde te lang. Controleer je internetverbinding en probeer het opnieuw met een kleinere foto.';
      } else if (error.message.includes('toestemming')) {
        errorMessage = 'Geen toestemming om de foto te uploaden. Probeer opnieuw in te loggen.';
      } else if (error.message.includes('te groot')) {
        errorMessage = error.message;
      } else if (error.message.includes('Opslagservice')) {
        errorMessage = 'De opslagservice is niet beschikbaar. Probeer de app opnieuw te laden.';
      } else if (error.message) {
        errorMessage = `Kon foto niet uploaden: ${error.message}`;
      }
      
      alert(errorMessage);
      
      // Probeer de observatie toch te behouden, zelfs zonder foto
      try {
        const updatedObservations = await getWalkObservations(walkId);
        setObservations(updatedObservations);
      } catch (refreshError) {
        console.error('Fout bij het verversen van observaties na mislukte foto upload:', refreshError);
      }
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

  // Functie om een vogellocatie te selecteren op de kaart
  const handleBirdLocationSelect = (location, showAll = false, radius = 2) => {
    setSelectedBirdLocation(location);
    setShowBirdsOnMap(true);
    
    // Sla de radius op om te tonen in de UI
    if (radius) {
      setSelectedBirdRadius(radius);
    }
  };

  // Functie om terug te gaan naar de normale kaartweergave
  const handleResetMapView = () => {
    setSelectedBirdLocation(null);
    setShowBirdsOnMap(false);
  };

  // Toon observatie modal
  const handleShowObservationModal = (category = '') => {
    setObservationCategory(category);
    setObservationText('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowObservationModal(true);
  };

  // Sluit observatie modal
  const handleCloseObservationModal = () => {
    setShowObservationModal(false);
  };

  // Voeg observatie toe
  const handleAddObservation = async () => {
    if (!observationText.trim()) return;
    
    try {
      setLoading(true);
      
      // Sla de observatie op
      const observationId = await saveObservation(observationText, observationCategory);
      
      if (!observationId) {
        console.error('Geen observatie ID ontvangen na opslaan');
        setError('Kon observatie niet opslaan');
        setLoading(false);
        return;
      }
      
      console.log('Observatie succesvol opgeslagen met ID:', observationId);
      
      // Als er een foto is, voeg deze toe
      if (photoFile && observationId) {
        console.log('Foto wordt toegevoegd aan observatie:', observationId);
        await handleFileUpload(observationId, photoFile);
      } else {
        // Als er geen foto is, ververs de observaties toch
        console.log('Geen foto om toe te voegen, observaties worden ververst');
        const updatedObservations = await getWalkObservations(walkId);
        console.log('Bijgewerkte observaties na toevoegen zonder foto:', updatedObservations);
        setObservations(updatedObservations);
      }
      
      // Sluit de modal
      setShowObservationModal(false);
      setLoading(false);
      
      // Toon een bevestiging
      alert('Observatie succesvol toegevoegd!');
    } catch (error) {
      console.error('Fout bij het toevoegen van observatie:', error);
      setError('Kon observatie niet toevoegen');
      setLoading(false);
    }
  };

  // Verwerk foto upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setPhotoFile(file);
    
    // Maak een preview van de foto met thumbnail functie
    createThumbnail(file, 800)
      .then(dataUrl => {
        setPhotoPreview(dataUrl);
      })
      .catch(error => {
        console.error('Fout bij het maken van thumbnail:', error);
        
        // Fallback naar de oude methode als thumbnail maken mislukt
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
      });
  };

  // Verwijder geselecteerde foto
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start locatie tracking wanneer de wandeling wordt geladen
  useEffect(() => {
    if (!walkId) return;
    
    console.log('Wandeling geladen, locatietracking initialiseren...');
    
    // Controleer eerst of locatieservices beschikbaar zijn
    checkLocationPermission(true).then(hasPermission => {
      if (hasPermission) {
        console.log('Locatietoestemming verleend, tracking starten');
        startTracking();
      } else {
        console.warn('Geen locatietoestemming, vragen om toestemming');
        // Vraag expliciet om toestemming
        requestLocationPermission().then(granted => {
          if (granted) {
            console.log('Locatietoestemming verleend na verzoek, tracking starten');
            startTracking();
          } else {
            setError('Locatietoestemming geweigerd. Sommige functies werken mogelijk niet correct.');
            // Start tracking met fallback
            startTracking();
          }
        });
      }
    });
    
    // Haal weergegevens op als we online zijn
    if (!isOffline) {
      fetchWeatherData();
    }
    
    // Cleanup functie
    return () => {
      if (watchIdRef.current) {
        console.log('Locatietracking stoppen bij unmount');
        stopLocationTracking(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [walkId, isOffline]);

  return (
    <div className="pb-20">
      {/* Aangepaste Header voor actieve wandeling */}
      <Header onAddObservation={handleStartObservation} onEndWalk={handleEndWalk} />
      
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
        {showBirdsOnMap && (
          <div className="bg-primary-50 p-2 flex justify-between items-center">
            <div className="flex items-center">
              <FaBinoculars className="text-primary-600 mr-2" />
              <span className="text-sm font-medium">
                {selectedBirdLocation && !Array.isArray(selectedBirdLocation) 
                  ? `${selectedBirdLocation.dutchName || selectedBirdLocation.name} op kaart` 
                  : `Vogelwaarnemingen binnen ${selectedBirdRadius} km`}
              </span>
            </div>
            <button 
              onClick={handleResetMapView}
              className="text-xs bg-white text-primary-600 border border-primary-300 px-2 py-1 rounded hover:bg-primary-50"
            >
              Terug naar wandeling
            </button>
          </div>
        )}
        <div className="h-64 sm:h-80">
          <LazyMapComponent 
            center={currentLocation} 
            pathPoints={pathPoints.map(p => [p.lat || p[0], p.lng || p[1]])}
            observations={observations}
            birdLocations={selectedBirdLocation}
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
      
      {/* Vogelwaarnemingen */}
      {currentLocation && (
        <div className="mb-6">
          <BirdObservations 
            location={currentLocation} 
            radius={selectedBirdRadius}
            onBirdLocationSelect={handleBirdLocationSelect}
          />
        </div>
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
            onClick={handleShowObservationModal}
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
      
      {/* Offline indicator */}
      {isOffline && <OfflineIndicator />}

      {/* Observatie modal */}
      {showObservationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Nieuwe observatie</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
              <select
                value={observationCategory}
                onChange={(e) => setObservationCategory(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md"
              >
                <option value="">Selecteer een categorie</option>
                {userSettings?.observationTags?.map(tag => (
                  <option key={tag} value={tag.toLowerCase()}>{tag}</option>
                )) || (
                  <>
                    <option value="algemeen">Algemeen</option>
                    <option value="plant">Plant</option>
                    <option value="dier">Dier</option>
                    <option value="vogel">Vogel</option>
                    <option value="insect">Insect</option>
                    <option value="landschap">Landschap</option>
                  </>
                )}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
              <textarea
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                placeholder="Typ je observatie..."
                className="w-full h-24 border border-gray-300 rounded-md p-2"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:bg-gray-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-1 text-sm text-gray-500">Klik om een foto toe te voegen</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handleCloseObservationModal}
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddObservation}
                disabled={!observationText.trim()}
                className={`py-2 px-4 rounded-md ${
                  observationText.trim() 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } transition-colors`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Opslaan...
                  </span>
                ) : (
                  'Opslaan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveWalkPage; 
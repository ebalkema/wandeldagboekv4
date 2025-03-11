/**
 * Service voor het werken met locatiegegevens
 */

// Standaard locatie (Amsterdam) als fallback
const DEFAULT_LOCATION = {
  lat: 52.3676,
  lng: 4.9041
};

// Foutcodes voor geolocation
const ERROR_CODES = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
  UNKNOWN_ERROR: 4
};

// Vertaal foutcodes naar gebruikersvriendelijke berichten
const getErrorMessage = (error) => {
  switch (error.code) {
    case ERROR_CODES.PERMISSION_DENIED:
      return 'Locatietoegang is geweigerd. Controleer je browserinstellingen en geef toestemming voor locatietoegang.';
    case ERROR_CODES.POSITION_UNAVAILABLE:
      return 'Locatie is niet beschikbaar. Dit kan gebeuren als je binnen bent of als er GPS-problemen zijn.';
    case ERROR_CODES.TIMEOUT:
      return 'Het ophalen van je locatie duurde te lang. Probeer het opnieuw.';
    case ERROR_CODES.UNKNOWN_ERROR:
      return 'Onbekende locatiefout (kCLErrorLocationUnknown). Dit kan tijdelijk zijn, probeer het later opnieuw.';
    default:
      return `Onbekende locatiefout: ${error.message || 'Geen details beschikbaar'}`;
  }
};

/**
 * Controleert of de browser locatieservices ondersteunt
 * @returns {boolean} - Of de browser locatieservices ondersteunt
 */
export const isBrowserLocationSupported = () => {
  return !!navigator.geolocation;
};

/**
 * Controleert of de browser locatietoestemming heeft
 * @returns {Promise<string>} - 'granted', 'denied', of 'prompt'
 */
export const checkLocationPermission = async () => {
  try {
    // Log browser informatie voor debugging
    logBrowserInfo();
    
    // Controleer of de browser navigator.permissions ondersteunt
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      console.log('Locatietoestemming status:', result.state);
      return result.state; // 'granted', 'denied', of 'prompt'
    } else {
      // Fallback voor browsers die navigator.permissions niet ondersteunen
      if (navigator.geolocation) {
        return 'prompt'; // We weten het niet zeker, dus gaan we uit van 'prompt'
      } else {
        return 'denied'; // Geolocation wordt niet ondersteund
      }
    }
  } catch (error) {
    console.error('Fout bij het controleren van locatietoestemming:', error);
    return 'prompt'; // Bij twijfel, vraag om toestemming
  }
};

/**
 * Vraagt expliciet om locatietoestemming
 * @returns {Promise<boolean>} - true als toestemming is verleend, anders false
 */
export const requestLocationPermission = async () => {
  console.log('Expliciet vragen om locatietoestemming...');
  
  try {
    // Vraag om de huidige positie om toestemming te triggeren
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    
    console.log('Locatietoestemming verleend!');
    return true;
  } catch (error) {
    console.error('Locatietoestemming geweigerd of fout:', error);
    return false;
  }
};

/**
 * Detecteert of de gebruiker op een macOS-apparaat zit
 * @returns {boolean} - Of de gebruiker op een macOS-apparaat zit
 */
export const isMacOS = () => {
  return navigator.platform.includes('Mac') || 
         navigator.userAgent.includes('Macintosh') || 
         navigator.userAgent.includes('Mac OS X');
};

/**
 * Detecteert of de gebruiker op een mobiel apparaat zit
 * @returns {boolean} - Of de gebruiker op een mobiel apparaat zit
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Detecteert of de gebruiker op een iOS-apparaat zit
 * @returns {boolean} - Of de gebruiker op een iOS-apparaat zit
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Detecteert of de gebruiker op een Android-apparaat zit
 * @returns {boolean} - Of de gebruiker op een Android-apparaat zit
 */
export const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

/**
 * Haalt de huidige locatie op
 * @returns {Promise<{lat: number, lng: number}>} - Huidige locatie
 */
export const getCurrentLocation = async () => {
  try {
    // Log browser informatie voor debugging
    logBrowserInfo();
    
    // Controleer of we op een macOS desktop zijn
    const isMacDesktop = isMacOS() && !isMobileDevice();
    
    // Controleer eerst de huidige toestemmingsstatus
    const permissionStatus = await checkLocationPermission();
    
    // Als de toestemming al is verleend, gebruik de echte locatie
    if (permissionStatus === 'granted') {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              isDefault: false
            };
            resolve(location);
          },
          (error) => {
            console.error('Fout bij het ophalen van locatie:', error);
            
            // Gebruik fallback locatie bij fout
            const fallbackLocation = getFallbackLocation();
            console.warn('Fallback locatie gebruikt vanwege fout:', fallbackLocation);
            resolve(fallbackLocation);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    } 
    // Als we op macOS desktop zijn en de toestemming is 'prompt', vraag expliciet om toestemming
    else if (isMacDesktop && permissionStatus === 'prompt') {
      console.log('macOS desktop gedetecteerd, expliciet vragen om locatietoestemming');
      
      const permissionGranted = await requestLocationPermission();
      
      if (permissionGranted) {
        // Toestemming verleend, probeer opnieuw de locatie op te halen
        return getCurrentLocation();
      } else {
        // Toestemming geweigerd, gebruik fallback locatie
        const fallbackLocation = getFallbackLocation();
        console.warn('Fallback locatie gebruikt na geweigerde toestemming');
        return fallbackLocation;
      }
    }
    // Als de toestemming is geweigerd of we zijn op een niet-ondersteund platform
    else if (permissionStatus === 'denied') {
      const fallbackLocation = getFallbackLocation();
      console.warn('Fallback locatie gebruikt vanwege geweigerde toestemming');
      return fallbackLocation;
    }
    // In alle andere gevallen, probeer de locatie op te halen
    else {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              isDefault: false
            };
            resolve(location);
          },
          (error) => {
            console.error('Fout bij het ophalen van locatie:', error);
            
            // Gebruik fallback locatie bij fout
            const fallbackLocation = getFallbackLocation();
            console.warn('Fallback locatie gebruikt vanwege fout:', fallbackLocation);
            resolve(fallbackLocation);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    }
  } catch (error) {
    console.error('Onverwachte fout bij het ophalen van locatie:', error);
    
    // Gebruik fallback locatie bij onverwachte fout
    const fallbackLocation = getFallbackLocation();
    console.warn('Fallback locatie gebruikt vanwege onverwachte fout');
    return fallbackLocation;
  }
};

// Houdt bij hoeveel opeenvolgende fouten er zijn opgetreden
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

// Houdt bij wanneer de laatste succesvolle locatie is ontvangen
let lastSuccessfulLocationTime = 0;
const MAX_LOCATION_AGE = 60000; // 60 seconden

// Houdt bij wanneer de laatste locatie is opgeslagen
let lastLocationSaveTime = 0;
const LOCATION_SAVE_INTERVAL = 60000; // 60 seconden (1 minuut)

/**
 * Start het volgen van de locatie
 * @param {Function} callback - Functie die wordt aangeroepen bij locatiewijzigingen
 * @param {Function} errorCallback - Functie die wordt aangeroepen bij locatiefouten
 * @param {boolean} useFallback - Of een fallback locatie moet worden gebruikt als de echte locatie niet beschikbaar is
 * @param {boolean} requestPermission - Of er expliciet om toestemming moet worden gevraagd als deze eerder is geweigerd
 * @returns {number|null} - ID van de watch die kan worden gebruikt om het volgen te stoppen, of null bij fallback
 */
export const startLocationTracking = (callback, errorCallback = null, useFallback = true, requestPermission = true) => {
  // Reset de tellers
  consecutiveErrors = 0;
  lastSuccessfulLocationTime = 0;
  lastLocationSaveTime = 0;
  
  // Detecteer apparaattype
  const isIOSDevice = isIOS();
  const isAndroidDevice = isAndroid();
  const isMacOSDevice = isMacOS();
  const isMobile = isMobileDevice();
  
  console.log('Start locatie tracking - apparaattype:', {
    isIOS: isIOSDevice,
    isAndroid: isAndroidDevice,
    isMacOS: isMacOSDevice,
    isMobile: isMobile
  });
  
  // Functie om fallback locatie te gebruiken
  const useFallbackLocation = (reason) => {
    console.info(`Fallback locatie wordt gebruikt voor tracking. Reden: ${reason}`);
    
    // Informeer de gebruiker dat we een fallback locatie gebruiken
    if (errorCallback) {
      errorCallback(new Error(`Locatie is niet beschikbaar. Fallback locatie wordt gebruikt. Reden: ${reason}`), 1);
    }
    
    // Simuleer locatie updates met kleine variaties rond de fallback locatie
    const intervalId = setInterval(() => {
      const now = Date.now();
      const randomLat = DEFAULT_LOCATION.lat + (Math.random() - 0.5) * 0.001; // ±~50m
      const randomLng = DEFAULT_LOCATION.lng + (Math.random() - 0.5) * 0.001; // ±~50m
      
      const location = {
        lat: randomLat,
        lng: randomLng,
        accuracy: 50, // 50 meter nauwkeurigheid
        timestamp: now,
        isDefault: true
      };
      
      callback(location);
      
      // Sla de tijd op van de laatste locatie
      lastSuccessfulLocationTime = now;
      
      // Controleer of we de locatie moeten opslaan (elke minuut)
      if (now - lastLocationSaveTime >= LOCATION_SAVE_INTERVAL) {
        console.log('Locatie opslaan (fallback, interval):', location);
        lastLocationSaveTime = now;
      }
    }, 5000); // Elke 5 seconden
    
    // Sla het interval ID op in een object dat we kunnen gebruiken om het later te stoppen
    return { type: 'fallback', id: intervalId };
  };
  
  if (!navigator.geolocation) {
    console.warn('Geolocation wordt niet ondersteund door deze browser.');
    if (useFallback) {
      return useFallbackLocation('Geolocation niet ondersteund');
    } else {
      const error = new Error('Geolocation wordt niet ondersteund door deze browser.');
      if (errorCallback) errorCallback(error, 1);
      throw error;
    }
  }
  
  // Als het een macOS-apparaat is en geen mobiel apparaat, gebruik direct de fallback
  if (isMacOSDevice && !isMobile && useFallback) {
    console.info('macOS desktop gedetecteerd, gebruik direct fallback locatie voor tracking om CoreLocation problemen te vermijden');
    return useFallbackLocation('macOS desktop gedetecteerd');
  }
  
  // Controleer eerst of locatie beschikbaar is en vraag om toestemming indien nodig
  checkLocationPermission(requestPermission)
    .then(available => {
      if (!available) {
        if (requestPermission) {
          // Vraag expliciet om toestemming als deze nog niet is verleend
          console.log('Expliciet vragen om locatietoestemming voor tracking...');
          requestLocationPermission().then(granted => {
            if (!granted && useFallback) {
              watchInfo = useFallbackLocation('Locatietoestemming geweigerd na verzoek');
            }
          });
        } else if (useFallback) {
          watchInfo = useFallbackLocation('Locatietoestemming geweigerd of niet beschikbaar');
        }
      }
    })
    .catch(error => {
      console.warn('Fout bij het controleren van locatiebeschikbaarheid:', error);
      if (useFallback) {
        watchInfo = useFallbackLocation('Fout bij het controleren van locatiebeschikbaarheid');
      }
    });
  
  // Maak een recovery timer die controleert of we nog steeds locaties ontvangen
  const recoveryTimerId = setInterval(() => {
    const now = Date.now();
    
    // Als we te lang geen locatie hebben ontvangen, probeer opnieuw te starten
    if (lastSuccessfulLocationTime > 0 && (now - lastSuccessfulLocationTime) > MAX_LOCATION_AGE) {
      console.warn(`Geen locatie updates ontvangen in ${MAX_LOCATION_AGE / 1000} seconden. Probeer opnieuw te starten.`);
      
      // Stop de huidige tracking
      if (watchInfo && watchInfo.type === 'geolocation') {
        navigator.geolocation.clearWatch(watchInfo.id);
      }
      
      // Vraag opnieuw om toestemming als dat nodig is
      if (requestPermission) {
        requestLocationPermission().then(granted => {
          if (granted) {
            // Start opnieuw na toestemming
            watchInfo = startWatchPosition();
          } else if (useFallback) {
            // Gebruik fallback als toestemming is geweigerd
            watchInfo = useFallbackLocation('Locatietoestemming geweigerd na recovery poging');
          }
        });
      } else {
        // Start opnieuw zonder toestemming te vragen
        watchInfo = startWatchPosition();
      }
      
      // Als we nog steeds geen locatie krijgen na meerdere pogingen, gebruik fallback
      if (consecutiveErrors > MAX_CONSECUTIVE_ERRORS && useFallback) {
        // Stop de huidige tracking
        if (watchInfo) {
          if (watchInfo.type === 'geolocation') {
            navigator.geolocation.clearWatch(watchInfo.id);
          } else if (watchInfo.type === 'fallback') {
            clearInterval(watchInfo.id);
          }
        }
        
        // Gebruik fallback
        watchInfo = useFallbackLocation('Geen locatie updates ontvangen na meerdere pogingen');
      }
    }
  }, 30000); // Controleer elke 30 seconden
  
  const handleError = (error) => {
    const errorMessage = getErrorMessage(error);
    console.error('Fout bij het volgen van locatie:', errorMessage);
    
    // Verhoog de teller voor opeenvolgende fouten
    consecutiveErrors++;
    
    // Roep de errorCallback aan als die is opgegeven
    if (errorCallback) {
      errorCallback(new Error(errorMessage), consecutiveErrors);
    }
    
    // Als de fout PERMISSION_DENIED is en we mogen om toestemming vragen
    if (error.code === ERROR_CODES.PERMISSION_DENIED && requestPermission) {
      console.log('Locatietoestemming geweigerd tijdens tracking, probeer opnieuw toestemming te vragen...');
      requestLocationPermission().then(granted => {
        if (granted) {
          // Reset de teller voor opeenvolgende fouten
          consecutiveErrors = 0;
          
          // Stop de huidige tracking
          if (watchInfo && watchInfo.type === 'geolocation') {
            navigator.geolocation.clearWatch(watchInfo.id);
          }
          
          // Start opnieuw na toestemming
          watchInfo = startWatchPosition();
        } else if (useFallback && consecutiveErrors > 3) {
          // Gebruik fallback als toestemming is geweigerd en er zijn meerdere fouten
          // Stop de huidige tracking
          if (watchInfo && watchInfo.type === 'geolocation') {
            navigator.geolocation.clearWatch(watchInfo.id);
          }
          
          // Gebruik fallback
          watchInfo = useFallbackLocation('Locatietoestemming geweigerd na meerdere pogingen');
        }
      });
      return;
    }
    
    // Als er te veel opeenvolgende fouten zijn en fallback is toegestaan, gebruik fallback
    if (consecutiveErrors > 3 && useFallback) {
      // Stop de huidige tracking
      if (watchInfo && watchInfo.type === 'geolocation') {
        navigator.geolocation.clearWatch(watchInfo.id);
      }
      
      // Gebruik fallback
      watchInfo = useFallbackLocation('Te veel locatiefouten');
    }
  };
  
  const startWatchPosition = () => {
    // Speciale instellingen voor iOS-apparaten
    const geoOptions = isIOSDevice ? 
      { 
        enableHighAccuracy: true,
        timeout: 30000, // Langere timeout voor iOS
        maximumAge: 0 // Forceer een nieuwe locatiebepaling op iOS
      } : isAndroidDevice ?
      {
        enableHighAccuracy: true,
        timeout: 20000, // Langere timeout voor Android
        maximumAge: 30000
      } :
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Reset de teller voor opeenvolgende fouten bij een succesvolle locatiebepaling
        consecutiveErrors = 0;
        const now = Date.now();
        lastSuccessfulLocationTime = now;
        
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || now,
          isDefault: false
        };
        
        callback(location);
        
        // Controleer of we de locatie moeten opslaan (elke minuut)
        if (now - lastLocationSaveTime >= LOCATION_SAVE_INTERVAL) {
          console.log('Locatie opslaan (interval):', location);
          lastLocationSaveTime = now;
        }
      },
      handleError,
      geoOptions
    );
    
    return { type: 'geolocation', id: watchId };
  };
  
  // Start de locatietracking
  let watchInfo = startWatchPosition();
  
  // Voeg de recovery timer toe aan het watchInfo object
  watchInfo.recoveryTimerId = recoveryTimerId;
  
  // Geef een object terug waarmee de tracking kan worden gestopt
  return watchInfo;
};

/**
 * Stopt het volgen van de locatie
 * @param {number|Object} watchInfo - ID van de watch of object met type en id
 */
export const stopLocationTracking = (watchInfo) => {
  if (!watchInfo) return;
  
  if (typeof watchInfo === 'object') {
    // Stop de recovery timer als die bestaat
    if (watchInfo.recoveryTimerId) {
      clearInterval(watchInfo.recoveryTimerId);
    }
    
    if (watchInfo.type === 'fallback') {
      clearInterval(watchInfo.id);
    } else if (watchInfo.type === 'geolocation' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchInfo.id);
    }
  } else if (navigator.geolocation) {
    // Voor backward compatibility
    navigator.geolocation.clearWatch(watchInfo);
  }
  
  // Reset de teller voor opeenvolgende fouten
  consecutiveErrors = 0;
  lastSuccessfulLocationTime = 0;
  lastLocationSaveTime = 0;
};

/**
 * Controleert of locatieservices beschikbaar zijn
 * @returns {Promise<boolean>} - True als locatieservices beschikbaar zijn
 */
export const checkLocationAvailability = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(false);
      return;
    }
    
    // Probeer een locatie op te halen met een korte timeout
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, 3000);
    
    navigator.geolocation.getCurrentPosition(
      () => {
        clearTimeout(timeoutId);
        resolve(true);
      },
      () => {
        clearTimeout(timeoutId);
        resolve(false);
      },
      { timeout: 3000, maximumAge: 60000 }
    );
  });
};

/**
 * Haalt de huidige positie op via de Geolocation API
 * @returns {Promise<GeolocationPosition>} - Geolocation positie
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation wordt niet ondersteund door deze browser.'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        reject(new Error(getErrorMessage(error)));
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 60000 
      }
    );
  });
};

/**
 * Berekent de afstand tussen twee punten in meters (Haversine formule)
 * @param {Array<number>} point1 - [lat, lng] van punt 1
 * @param {Array<number>} point2 - [lat, lng] van punt 2
 * @returns {number} - Afstand in meters
 */
export const calculateDistance = (point1, point2) => {
  const R = 6371e3; // Aardstraal in meters
  const φ1 = point1[0] * Math.PI/180;
  const φ2 = point2[0] * Math.PI/180;
  const Δφ = (point2[0] - point1[0]) * Math.PI/180;
  const Δλ = (point2[1] - point1[1]) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Afstand in meters
  
  return d;
};

/**
 * Berekent de totale afstand van een route in meters
 * @param {Array<Array<number>>} points - Array van [lat, lng] punten
 * @returns {number} - Totale afstand in meters
 */
export const calculateRouteDistance = (points) => {
  if (!points || points.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistance(points[i-1], points[i]);
  }
  
  return totalDistance;
};

/**
 * Formatteert een afstand in meters naar een leesbare string
 * @param {number} meters - Afstand in meters
 * @returns {string} - Geformatteerde afstand
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(2)} km`;
  }
};

/**
 * Update het wandelpad met een nieuwe locatie
 * @param {Array} prevPoints - Vorige punten in het pad
 * @param {Object} location - Nieuwe locatie {lat, lng}
 * @param {number} minDistance - Minimale afstand in meters tussen punten
 * @returns {Array} - Bijgewerkt pad
 */
export const updatePathPoints = (prevPoints, location, minDistance = 5) => {
  if (!location || !location.lat || !location.lng) {
    console.warn('Ongeldige locatie ontvangen in updatePathPoints:', location);
    return prevPoints;
  }
  
  // Zorg ervoor dat prevPoints een array is
  const points = Array.isArray(prevPoints) ? [...prevPoints] : [];
  
  // Als dit het eerste punt is, voeg het toe
  if (points.length === 0) {
    console.log('Eerste punt toegevoegd aan pad:', [location.lat, location.lng]);
    return [[location.lat, location.lng]];
  }
  
  // Haal het laatste punt op
  const lastPoint = points[points.length - 1];
  
  // Controleer of lastPoint een array is met twee elementen
  if (!Array.isArray(lastPoint) || lastPoint.length !== 2) {
    console.warn('Ongeldig laatste punt in pad:', lastPoint);
    // Voeg het nieuwe punt toe en ga verder
    return [...points, [location.lat, location.lng]];
  }
  
  // Bereken de afstand tussen het laatste punt en het nieuwe punt
  const lastLat = lastPoint[0];
  const lastLng = lastPoint[1];
  const distance = calculateDistance(
    { lat: lastLat, lng: lastLng },
    { lat: location.lat, lng: location.lng }
  );
  
  // Als de afstand groter is dan de minimale afstand, voeg het nieuwe punt toe
  if (distance >= minDistance) {
    const newPoints = [...points, [location.lat, location.lng]];
    
    // Log informatie over het pad
    if (newPoints.length % 10 === 0) {
      console.log(`Pad bijgewerkt: ${newPoints.length} punten, laatste afstand: ${distance.toFixed(2)}m`);
    }
    
    return newPoints;
  }
  
  // Anders, retourneer het ongewijzigde pad
  return points;
}; 
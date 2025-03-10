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
 * Haalt de huidige locatie op
 * @param {boolean} useFallback - Of een fallback locatie moet worden gebruikt als de echte locatie niet beschikbaar is
 * @returns {Promise<{lat: number, lng: number, isDefault: boolean}>} - Huidige locatie
 */
export const getCurrentLocation = (useFallback = true) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation wordt niet ondersteund door deze browser.');
      if (useFallback) {
        console.info('Fallback locatie wordt gebruikt.');
        resolve({...DEFAULT_LOCATION, isDefault: true});
      } else {
        reject(new Error('Geolocation wordt niet ondersteund door deze browser.'));
      }
      return;
    }
    
    const timeoutId = setTimeout(() => {
      console.warn('Locatie ophalen duurde te lang, fallback locatie wordt gebruikt.');
      if (useFallback) {
        resolve({...DEFAULT_LOCATION, isDefault: true});
      } else {
        reject(new Error('Locatie ophalen duurde te lang.'));
      }
    }, 20000); // 20 seconden timeout (verhoogd van 15)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          isDefault: false
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        const errorMessage = getErrorMessage(error);
        console.warn('Fout bij het ophalen van locatie:', errorMessage);
        
        if (useFallback) {
          console.info('Fallback locatie wordt gebruikt.');
          resolve({...DEFAULT_LOCATION, isDefault: true, error: errorMessage});
        } else {
          reject(new Error(errorMessage));
        }
      },
      { 
        enableHighAccuracy: true,
        timeout: 20000, // 20 seconden timeout (verhoogd van 15)
        maximumAge: 60000 // 60 seconden (verhoogd van 30)
      }
    );
  });
};

// Houdt bij hoeveel opeenvolgende fouten er zijn opgetreden
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

// Houdt bij wanneer de laatste succesvolle locatie is ontvangen
let lastSuccessfulLocationTime = 0;
const MAX_LOCATION_AGE = 60000; // 60 seconden

/**
 * Start het volgen van de locatie
 * @param {Function} callback - Functie die wordt aangeroepen bij locatiewijzigingen
 * @param {Function} errorCallback - Functie die wordt aangeroepen bij locatiefouten
 * @param {boolean} useFallback - Of een fallback locatie moet worden gebruikt als de echte locatie niet beschikbaar is
 * @returns {number|null} - ID van de watch die kan worden gebruikt om het volgen te stoppen, of null bij fallback
 */
export const startLocationTracking = (callback, errorCallback = null, useFallback = true) => {
  // Reset de teller voor opeenvolgende fouten
  consecutiveErrors = 0;
  lastSuccessfulLocationTime = 0;
  
  if (!navigator.geolocation) {
    console.warn('Geolocation wordt niet ondersteund door deze browser.');
    if (useFallback) {
      console.info('Fallback locatie wordt gebruikt voor tracking.');
      // Simuleer locatie updates met kleine variaties rond de fallback locatie
      const intervalId = setInterval(() => {
        const randomLat = DEFAULT_LOCATION.lat + (Math.random() - 0.5) * 0.001; // ±~50m
        const randomLng = DEFAULT_LOCATION.lng + (Math.random() - 0.5) * 0.001; // ±~50m
        
        callback({
          lat: randomLat,
          lng: randomLng,
          accuracy: 50, // 50 meter nauwkeurigheid
          timestamp: Date.now(),
          isDefault: true
        });
      }, 5000); // Elke 5 seconden
      
      // Sla het interval ID op in een object dat we kunnen gebruiken om het later te stoppen
      return { type: 'fallback', id: intervalId };
    } else {
      const error = new Error('Geolocation wordt niet ondersteund door deze browser.');
      if (errorCallback) errorCallback(error);
      throw error;
    }
  }
  
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
      
      // Start opnieuw
      watchInfo = startWatchPosition();
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
    
    // Als de fout kCLErrorLocationUnknown is (vaak in iOS/Safari), wacht even en probeer opnieuw
    if (error.code === ERROR_CODES.UNKNOWN_ERROR || error.message?.includes('kCLErrorLocationUnknown')) {
      console.log('kCLErrorLocationUnknown gedetecteerd, wacht even en probeer opnieuw');
      
      // Wacht 5 seconden en probeer dan de laatste bekende locatie te gebruiken
      setTimeout(() => {
        getCurrentLocation(true).then(location => {
          if (!location.isDefault) {
            callback(location);
          }
        }).catch(err => console.error('Fout bij het ophalen van locatie na kCLErrorLocationUnknown:', err));
      }, 5000);
    }
    
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn(`${MAX_CONSECUTIVE_ERRORS} opeenvolgende locatiefouten. Schakel over naar fallback.`);
      if (useFallback) {
        // Als er te veel fouten zijn opgetreden, schakel over naar fallback
        console.info('Overschakelen naar fallback locatie voor tracking.');
        
        // Stop de huidige tracking
        if (watchInfo) {
          stopLocationTracking(watchInfo);
        }
        
        // Stop de recovery timer
        clearInterval(recoveryTimerId);
        
        // Start fallback tracking
        return startLocationTracking(callback, errorCallback, true);
      }
    }
  };
  
  const startWatchPosition = () => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Reset de teller voor opeenvolgende fouten bij een succesvolle locatiebepaling
        consecutiveErrors = 0;
        lastSuccessfulLocationTime = Date.now();
        
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          isDefault: false
        });
      },
      handleError,
      { 
        enableHighAccuracy: true,
        timeout: 20000, // 20 seconden timeout (verhoogd van 15)
        maximumAge: 60000 // 60 seconden (verhoogd van 30)
      }
    );
    
    return { type: 'geolocation', id: watchId };
  };
  
  // Start de locatietracking
  let watchInfo = startWatchPosition();
  
  // Voeg de recovery timer toe aan het watchInfo object
  watchInfo.recoveryTimerId = recoveryTimerId;
  
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
    
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted' || result.state === 'prompt') {
        resolve(true);
      } else {
        resolve(false);
      }
    }).catch(() => {
      // Als de permissions API niet beschikbaar is, probeer een locatie op te halen
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 5000); // Verhoogd van 3000
      
      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeoutId);
          resolve(true);
        },
        () => {
          clearTimeout(timeoutId);
          resolve(false);
        },
        { timeout: 5000, maximumAge: 60000 } // Verhoogd van 3000
      );
    });
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
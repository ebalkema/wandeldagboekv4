/**
 * Service voor het werken met locatiegegevens
 */

// Standaard locatie (Amsterdam) als fallback
const DEFAULT_LOCATION = {
  lat: 52.3676,
  lng: 4.9041
};

/**
 * Haalt de huidige locatie op
 * @param {boolean} useFallback - Of een fallback locatie moet worden gebruikt als de echte locatie niet beschikbaar is
 * @returns {Promise<{lat: number, lng: number}>} - Huidige locatie
 */
export const getCurrentLocation = (useFallback = true) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation wordt niet ondersteund door deze browser.');
      if (useFallback) {
        console.info('Fallback locatie wordt gebruikt.');
        resolve(DEFAULT_LOCATION);
      } else {
        reject(new Error('Geolocation wordt niet ondersteund door deze browser.'));
      }
      return;
    }
    
    const timeoutId = setTimeout(() => {
      console.warn('Locatie ophalen duurde te lang, fallback locatie wordt gebruikt.');
      if (useFallback) {
        resolve(DEFAULT_LOCATION);
      } else {
        reject(new Error('Locatie ophalen duurde te lang.'));
      }
    }, 10000); // 10 seconden timeout
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.warn('Fout bij het ophalen van locatie:', error.message);
        if (useFallback) {
          console.info('Fallback locatie wordt gebruikt.');
          resolve(DEFAULT_LOCATION);
        } else {
          reject(error);
        }
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
 * Start het volgen van de locatie
 * @param {Function} callback - Functie die wordt aangeroepen bij locatiewijzigingen
 * @param {boolean} useFallback - Of een fallback locatie moet worden gebruikt als de echte locatie niet beschikbaar is
 * @returns {number|null} - ID van de watch die kan worden gebruikt om het volgen te stoppen, of null bij fallback
 */
export const startLocationTracking = (callback, useFallback = true) => {
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
          timestamp: Date.now()
        });
      }, 5000); // Elke 5 seconden
      
      // Sla het interval ID op in een object dat we kunnen gebruiken om het later te stoppen
      return { type: 'fallback', id: intervalId };
    } else {
      throw new Error('Geolocation wordt niet ondersteund door deze browser.');
    }
  }
  
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
    },
    (error) => {
      console.error('Fout bij het volgen van locatie:', error);
      if (useFallback) {
        // Als er een fout optreedt, schakel over naar fallback
        console.info('Overschakelen naar fallback locatie voor tracking.');
        stopLocationTracking(watchId);
        return startLocationTracking(callback, true);
      }
    },
    { 
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
  
  return { type: 'geolocation', id: watchId };
};

/**
 * Stopt het volgen van de locatie
 * @param {number|Object} watchInfo - ID van de watch of object met type en id
 */
export const stopLocationTracking = (watchInfo) => {
  if (!watchInfo) return;
  
  if (typeof watchInfo === 'object') {
    if (watchInfo.type === 'fallback') {
      clearInterval(watchInfo.id);
    } else if (watchInfo.type === 'geolocation' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchInfo.id);
    }
  } else if (navigator.geolocation) {
    // Voor backward compatibility
    navigator.geolocation.clearWatch(watchInfo);
  }
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
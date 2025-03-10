/**
 * Service voor het werken met locatiegegevens
 */

/**
 * Haalt de huidige locatie op
 * @returns {Promise<{lat: number, lng: number}>} - Huidige locatie
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation wordt niet ondersteund door deze browser.'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true }
    );
  });
};

/**
 * Start het volgen van de locatie
 * @param {Function} callback - Functie die wordt aangeroepen bij locatiewijzigingen
 * @returns {number} - ID van de watch die kan worden gebruikt om het volgen te stoppen
 */
export const startLocationTracking = (callback) => {
  if (!navigator.geolocation) {
    throw new Error('Geolocation wordt niet ondersteund door deze browser.');
  }
  
  return navigator.geolocation.watchPosition(
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
    },
    { enableHighAccuracy: true }
  );
};

/**
 * Stopt het volgen van de locatie
 * @param {number} watchId - ID van de watch die moet worden gestopt
 */
export const stopLocationTracking = (watchId) => {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
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
/**
 * Service voor integratie met de eBird API
 * 
 * Deze service biedt functionaliteit om vogelwaarnemingen op te halen
 * op basis van locatie en datum.
 * 
 * API documentatie: https://documenter.getpostman.com/view/664302/S1ENwy59
 */

// eBird API configuratie
const API_KEY = 'ddqtvos8h97l'; // eBird API-sleutel
const BASE_URL = 'https://api.ebird.org/v2';

// Cache voor eBird gegevens
const CACHE_KEY = 'ebirdCache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 uur in milliseconden

/**
 * Haalt recente vogelwaarnemingen op binnen een bepaalde straal van een locatie
 * @param {number} lat - Breedtegraad
 * @param {number} lng - Lengtegraad
 * @param {number} radius - Straal in kilometers (max 50)
 * @param {number} days - Aantal dagen terug om waarnemingen op te halen (max 30)
 * @returns {Promise<Array>} - Lijst met vogelwaarnemingen
 */
export const getNearbyObservations = async (lat, lng, radius = 10, days = 7) => {
  try {
    // Controleer of er recente gegevens in de cache staan
    const cachedData = checkCache(lat, lng, radius);
    if (cachedData) {
      console.log('Vogelwaarnemingen uit cache geladen');
      return cachedData;
    }

    // Beperk de parameters tot geldige waarden
    const validRadius = Math.min(50, Math.max(1, radius));
    const validDays = Math.min(30, Math.max(1, days));
    
    // Converteer radius van km naar mijlen (eBird API gebruikt mijlen)
    const radiusMiles = Math.round(validRadius * 0.621371);
    
    // Bouw de URL op
    const url = `${BASE_URL}/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=${radiusMiles}&back=${validDays}&maxResults=100`;
    
    // Voer de API-aanvraag uit
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`eBird API fout: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verwerk de gegevens
    const observations = data.map(obs => ({
      speciesCode: obs.speciesCode,
      commonName: obs.comName,
      scientificName: obs.sciName,
      location: {
        name: obs.locName,
        lat: obs.lat,
        lng: obs.lng
      },
      observationDate: obs.obsDt,
      howMany: obs.howMany || 1,
      isRare: !!obs.obsReviewed
    }));
    
    // Sla de gegevens op in de cache
    saveToCache(lat, lng, radius, observations);
    
    return observations;
  } catch (error) {
    console.error('Fout bij het ophalen van vogelwaarnemingen:', error);
    return [];
  }
};

/**
 * Haalt informatie op over een specifieke vogelsoort
 * @param {string} speciesCode - eBird soortcode
 * @returns {Promise<Object>} - Informatie over de vogelsoort
 */
export const getSpeciesInfo = async (speciesCode) => {
  try {
    // Controleer of er gegevens in de cache staan
    const cacheKey = `species_${speciesCode}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      const now = new Date().getTime();
      
      // Controleer of de cache niet ouder is dan 30 dagen
      if (now - timestamp < 30 * 24 * 60 * 60 * 1000) {
        return data;
      }
    }
    
    // Bouw de URL op
    const url = `${BASE_URL}/ref/taxonomy/ebird?fmt=json&species=${speciesCode}`;
    
    // Voer de API-aanvraag uit
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`eBird API fout: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verwerk de gegevens
    const speciesInfo = {
      speciesCode: data.speciesCode,
      commonName: data.comName,
      scientificName: data.sciName,
      familyCommonName: data.familyComName,
      familyScientificName: data.familySciName,
      order: data.order,
      category: data.category
    };
    
    // Sla de gegevens op in de cache
    localStorage.setItem(cacheKey, JSON.stringify({
      data: speciesInfo,
      timestamp: new Date().getTime()
    }));
    
    return speciesInfo;
  } catch (error) {
    console.error('Fout bij het ophalen van soortinformatie:', error);
    return null;
  }
};

/**
 * Haalt hotspots op binnen een bepaalde straal van een locatie
 * @param {number} lat - Breedtegraad
 * @param {number} lng - Lengtegraad
 * @param {number} radius - Straal in kilometers (max 50)
 * @returns {Promise<Array>} - Lijst met hotspots
 */
export const getNearbyHotspots = async (lat, lng, radius = 10) => {
  try {
    // Beperk de parameters tot geldige waarden
    const validRadius = Math.min(50, Math.max(1, radius));
    
    // Converteer radius van km naar mijlen (eBird API gebruikt mijlen)
    const radiusMiles = Math.round(validRadius * 0.621371);
    
    // Bouw de URL op
    const url = `${BASE_URL}/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=${radiusMiles}&fmt=json`;
    
    // Voer de API-aanvraag uit
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`eBird API fout: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verwerk de gegevens
    const hotspots = data.map(spot => ({
      locId: spot.locId,
      name: spot.locName,
      latitude: spot.lat,
      longitude: spot.lng,
      countryCode: spot.countryCode,
      subnational1Code: spot.subnational1Code,
      latestObsDate: spot.latestObsDt || null,
      numSpeciesAllTime: spot.numSpeciesAllTime || 0
    }));
    
    return hotspots;
  } catch (error) {
    console.error('Fout bij het ophalen van hotspots:', error);
    return [];
  }
};

/**
 * Controleert of er recente gegevens in de cache staan
 * @param {number} lat - Breedtegraad
 * @param {number} lng - Lengtegraad
 * @param {number} radius - Straal in kilometers
 * @returns {Array|null} - Gecachte gegevens of null
 */
const checkCache = (lat, lng, radius) => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    
    if (!cachedData) {
      return null;
    }
    
    const { data, timestamp, coords, searchRadius } = JSON.parse(cachedData);
    const now = new Date().getTime();
    
    // Controleer of de cache niet verlopen is
    if (now - timestamp > CACHE_EXPIRY) {
      return null;
    }
    
    // Controleer of de locatie ongeveer hetzelfde is
    const isSameLocation = 
      Math.abs(coords.lat - lat) < 0.01 && 
      Math.abs(coords.lng - lng) < 0.01;
    
    // Controleer of de straal hetzelfde is
    const isSameRadius = searchRadius === radius;
    
    if (isSameLocation && isSameRadius) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Fout bij het lezen van de eBird cache:', error);
    return null;
  }
};

/**
 * Slaat gegevens op in de cache
 * @param {number} lat - Breedtegraad
 * @param {number} lng - Lengtegraad
 * @param {number} radius - Straal in kilometers
 * @param {Array} data - Gegevens om op te slaan
 */
const saveToCache = (lat, lng, radius, data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: new Date().getTime(),
      coords: { lat, lng },
      searchRadius: radius
    }));
  } catch (error) {
    console.error('Fout bij het opslaan van de eBird cache:', error);
  }
}; 
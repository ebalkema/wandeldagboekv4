/**
 * Biodiversiteit API Service
 * Gebaseerd op de Nederlandse Biodiversiteit API: https://docs.biodiversitydata.nl/endpoints-reference/
 */

const API_BASE_URL = 'https://api.biodiversitydata.nl';

/**
 * Zoekt naar soorten in een bepaald gebied
 * @param {number} latitude - Breedtegraad van het centrum van het zoekgebied
 * @param {number} longitude - Lengtegraad van het centrum van het zoekgebied
 * @param {number} radius - Straal van het zoekgebied in meters
 * @param {Object} options - Extra opties zoals datumrange, soortgroepen, etc.
 * @returns {Promise<Array>} - Array met soorten in het gebied
 */
export const getSpeciesInArea = async (latitude, longitude, radius = 1000, options = {}) => {
  try {
    const { dateFrom, dateTo, speciesGroups } = options;
    
    let queryParams = [
      `geoShape=CIRCLE(${latitude} ${longitude} ${radius})`
    ];
    
    if (dateFrom) queryParams.push(`dateFrom=${dateFrom}`);
    if (dateTo) queryParams.push(`dateTo=${dateTo}`);
    if (speciesGroups && speciesGroups.length > 0) {
      queryParams.push(`speciesGroups=${speciesGroups.join(',')}`);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/v2/observation/search?${queryParams.join('&')}`
    );
    
    if (!response.ok) {
      throw new Error(`API fout: ${response.status}`);
    }
    
    const data = await response.json();
    return data.species || [];
  } catch (error) {
    console.error('Fout bij het ophalen van soorten in gebied:', error);
    return [];
  }
};

/**
 * Haalt gedetailleerde informatie op over een specifieke soort
 * @param {string} speciesId - ID van de soort
 * @returns {Promise<Object>} - Gedetailleerde soortinformatie
 */
export const getSpeciesDetails = async (speciesId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/v2/species/${speciesId}`);
    
    if (!response.ok) {
      throw new Error(`API fout: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Fout bij het ophalen van soortdetails voor ${speciesId}:`, error);
    return null;
  }
};

/**
 * Haalt afbeeldingen op voor een specifieke soort
 * @param {string} speciesId - ID van de soort
 * @returns {Promise<Array>} - Array met media-items
 */
export const getSpeciesMedia = async (speciesId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/v2/species/${speciesId}/media`);
    
    if (!response.ok) {
      throw new Error(`API fout: ${response.status}`);
    }
    
    const data = await response.json();
    return data.mediaItems || [];
  } catch (error) {
    console.error(`Fout bij het ophalen van soortmedia voor ${speciesId}:`, error);
    return [];
  }
};

/**
 * Zoekt naar waarnemingen in een bepaald gebied
 * @param {Object} bounds - Grenzen van het zoekgebied {north, east, south, west}
 * @param {Object} options - Extra opties zoals datumrange, soortgroepen, etc.
 * @returns {Promise<Array>} - Array met waarnemingen
 */
export const getObservationsInArea = async (bounds, options = {}) => {
  try {
    const { north, east, south, west } = bounds;
    const { dateFrom, dateTo, speciesGroups, limit = 100 } = options;
    
    const polygon = `POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
    
    let queryParams = [
      `geoShape=${polygon}`,
      `limit=${limit}`
    ];
    
    if (dateFrom) queryParams.push(`dateFrom=${dateFrom}`);
    if (dateTo) queryParams.push(`dateTo=${dateTo}`);
    if (speciesGroups && speciesGroups.length > 0) {
      queryParams.push(`speciesGroups=${speciesGroups.join(',')}`);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/v2/observation/search?${queryParams.join('&')}`
    );
    
    if (!response.ok) {
      throw new Error(`API fout: ${response.status}`);
    }
    
    const data = await response.json();
    return data.observations || [];
  } catch (error) {
    console.error('Fout bij het ophalen van waarnemingen in gebied:', error);
    return [];
  }
};

/**
 * Haalt geclusterde waarnemingen op voor weergave op een kaart
 * @param {Object} bounds - Grenzen van het zoekgebied {north, east, south, west}
 * @param {Object} options - Extra opties zoals datumrange, soortgroepen, etc.
 * @returns {Promise<Array>} - Array met clusters van waarnemingen
 */
export const getObservationClusters = async (bounds, options = {}) => {
  try {
    const { north, east, south, west } = bounds;
    const { dateFrom, dateTo, speciesGroups } = options;
    
    const polygon = `POLYGON((${west} ${south}, ${east} ${south}, ${east} ${north}, ${west} ${north}, ${west} ${south}))`;
    
    let queryParams = [
      `geoShape=${polygon}`
    ];
    
    if (dateFrom) queryParams.push(`dateFrom=${dateFrom}`);
    if (dateTo) queryParams.push(`dateTo=${dateTo}`);
    if (speciesGroups && speciesGroups.length > 0) {
      queryParams.push(`speciesGroups=${speciesGroups.join(',')}`);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/v2/observation/cluster?${queryParams.join('&')}`
    );
    
    if (!response.ok) {
      throw new Error(`API fout: ${response.status}`);
    }
    
    const data = await response.json();
    return data.clusters || [];
  } catch (error) {
    console.error('Fout bij het ophalen van waarnemingsclusters:', error);
    return [];
  }
};

/**
 * Zoekt naar taxonomische groepen
 * @param {string} query - Zoekopdracht
 * @param {string} rank - Taxonomisch niveau (bijv. 'CLASS', 'ORDER', 'FAMILY')
 * @returns {Promise<Array>} - Array met taxonomische groepen
 */
export const searchTaxa = async (query, rank = null) => {
  try {
    let queryParams = [];
    
    if (query) queryParams.push(`q=${encodeURIComponent(query)}`);
    if (rank) queryParams.push(`rank=${rank}`);
    
    const response = await fetch(
      `${API_BASE_URL}/v2/taxon/search?${queryParams.join('&')}`
    );
    
    if (!response.ok) {
      throw new Error(`API fout: ${response.status}`);
    }
    
    const data = await response.json();
    return data.taxa || [];
  } catch (error) {
    console.error('Fout bij het zoeken naar taxa:', error);
    return [];
  }
};

/**
 * Haalt onderliggende taxa op van een bepaalde taxonomische groep
 * @param {string} taxonId - ID van de taxonomische groep
 * @returns {Promise<Array>} - Array met onderliggende taxa
 */
export const getTaxonChildren = async (taxonId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/v2/taxon/${taxonId}/children`);
    
    if (!response.ok) {
      throw new Error(`API fout: ${response.status}`);
    }
    
    const data = await response.json();
    return data.taxa || [];
  } catch (error) {
    console.error(`Fout bij het ophalen van onderliggende taxa voor ${taxonId}:`, error);
    return [];
  }
};

/**
 * Haalt de huidige datum op in ISO-formaat (YYYY-MM-DD)
 * @returns {string} - Huidige datum in ISO-formaat
 */
export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Haalt de datum van een maand geleden op in ISO-formaat (YYYY-MM-DD)
 * @returns {string} - Datum van een maand geleden in ISO-formaat
 */
export const getLastMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split('T')[0];
};

/**
 * Bepaalt het huidige seizoen en geeft start- en einddatum
 * @returns {Object} - Object met start- en einddatum van het huidige seizoen
 */
export const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Lente: maart - mei
  if (month >= 2 && month <= 4) {
    return {
      name: 'lente',
      start: `${year}-03-01`,
      end: `${year}-05-31`
    };
  }
  // Zomer: juni - augustus
  else if (month >= 5 && month <= 7) {
    return {
      name: 'zomer',
      start: `${year}-06-01`,
      end: `${year}-08-31`
    };
  }
  // Herfst: september - november
  else if (month >= 8 && month <= 10) {
    return {
      name: 'herfst',
      start: `${year}-09-01`,
      end: `${year}-11-30`
    };
  }
  // Winter: december - februari
  else {
    return {
      name: 'winter',
      start: month === 11 ? `${year}-12-01` : `${year-1}-12-01`,
      end: month <= 1 ? `${year}-02-28` : `${year+1}-02-28`
    };
  }
}; 
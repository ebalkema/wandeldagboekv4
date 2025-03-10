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

// Mapping van veelvoorkomende vogels (Engels naar Nederlands)
// Dit is een fallback voor als we geen Nederlandse naam kunnen ophalen via de API
const COMMON_BIRDS_NL = {
  'Eurasian Blackbird': 'Merel',
  'European Robin': 'Roodborst',
  'Great Tit': 'Koolmees',
  'Blue Tit': 'Pimpelmees',
  'House Sparrow': 'Huismus',
  'Common Chaffinch': 'Vink',
  'Common Wood Pigeon': 'Houtduif',
  'Eurasian Magpie': 'Ekster',
  'Carrion Crow': 'Zwarte Kraai',
  'Eurasian Jay': 'Gaai',
  'Common Starling': 'Spreeuw',
  'Common Blackbird': 'Merel',
  'European Greenfinch': 'Groenling',
  'European Goldfinch': 'Putter',
  'Common Chiffchaff': 'Tjiftjaf',
  'Eurasian Blue Tit': 'Pimpelmees',
  'Great Spotted Woodpecker': 'Grote Bonte Specht',
  'Eurasian Wren': 'Winterkoning',
  'Black-headed Gull': 'Kokmeeuw',
  'Eurasian Collared-Dove': 'Turkse Tortel',
  'Common Swift': 'Gierzwaluw',
  'Barn Swallow': 'Boerenzwaluw',
  'White Wagtail': 'Witte Kwikstaart',
  'Grey Heron': 'Blauwe Reiger',
  'Mallard': 'Wilde Eend',
  'Mute Swan': 'Knobbelzwaan',
  'Common Moorhen': 'Waterhoen',
  'Eurasian Coot': 'Meerkoet',
  'Common Kingfisher': 'IJsvogel',
  'Common Buzzard': 'Buizerd',
  'Common Kestrel': 'Torenvalk',
  'Tawny Owl': 'Bosuil',
  'Long-tailed Tit': 'Staartmees',
  'Eurasian Nuthatch': 'Boomklever',
  'Short-toed Treecreeper': 'Boomkruiper',
  'Eurasian Bullfinch': 'Goudvink',
  'Reed Bunting': 'Rietgors',
  'Common Reed Bunting': 'Rietgors',
  'Common Linnet': 'Kneu',
  'European Goldfinch': 'Putter',
  'European Greenfinch': 'Groenling',
  'Yellowhammer': 'Geelgors',
  'Dunnock': 'Heggenmus',
  'Song Thrush': 'Zanglijster',
  'Mistle Thrush': 'Grote Lijster',
  'Fieldfare': 'Kramsvogel',
  'Redwing': 'Koperwiek',
  'Spotted Flycatcher': 'Grauwe Vliegenvanger',
  'European Pied Flycatcher': 'Bonte Vliegenvanger',
  'Willow Warbler': 'Fitis',
  'Eurasian Blackcap': 'Zwartkop',
  'Garden Warbler': 'Tuinfluiter',
  'Lesser Whitethroat': 'Braamsluiper',
  'Common Whitethroat': 'Grasmus',
  'Sedge Warbler': 'Rietzanger',
  'Eurasian Reed Warbler': 'Kleine Karekiet',
  'Great Reed Warbler': 'Grote Karekiet',
  'Marsh Warbler': 'Bosrietzanger',
  'Icterine Warbler': 'Spotvogel',
  'Common Nightingale': 'Nachtegaal',
  'Black Redstart': 'Zwarte Roodstaart',
  'European Stonechat': 'Roodborsttapuit',
  'Northern Wheatear': 'Tapuit',
  'Western Yellow Wagtail': 'Gele Kwikstaart',
  'Meadow Pipit': 'Graspieper',
  'Tree Pipit': 'Boompieper',
  'Common Cuckoo': 'Koekoek',
  'Common Pheasant': 'Fazant',
  'Grey Partridge': 'Patrijs',
  'Common Quail': 'Kwartel',
  'Water Rail': 'Waterral',
  'Spotted Crake': 'Porseleinhoen',
  'Common Crane': 'Kraanvogel',
  'Eurasian Oystercatcher': 'Scholekster',
  'Northern Lapwing': 'Kievit',
  'Common Snipe': 'Watersnip',
  'Eurasian Woodcock': 'Houtsnip',
  'Common Sandpiper': 'Oeverloper',
  'Green Sandpiper': 'Witgat',
  'Common Redshank': 'Tureluur',
  'Black-tailed Godwit': 'Grutto',
  'Eurasian Curlew': 'Wulp',
  'Ruff': 'Kemphaan',
  'Little Grebe': 'Dodaars',
  'Great Crested Grebe': 'Fuut',
  'Great Cormorant': 'Aalscholver',
  'Little Egret': 'Kleine Zilverreiger',
  'Great Egret': 'Grote Zilverreiger',
  'Eurasian Spoonbill': 'Lepelaar',
  'White Stork': 'Ooievaar',
  'Greylag Goose': 'Grauwe Gans',
  'Canada Goose': 'Canadese Gans',
  'Barnacle Goose': 'Brandgans',
  'Common Shelduck': 'Bergeend',
  'Gadwall': 'Krakeend',
  'Eurasian Teal': 'Wintertaling',
  'Common Pochard': 'Tafeleend',
  'Tufted Duck': 'Kuifeend',
  'Common Goldeneye': 'Brilduiker',
  'Common Merganser': 'Grote Zaagbek',
  'Red-breasted Merganser': 'Middelste Zaagbek',
  'Western Marsh Harrier': 'Bruine Kiekendief',
  'Eurasian Sparrowhawk': 'Sperwer',
  'Northern Goshawk': 'Havik',
  'Red Kite': 'Rode Wouw',
  'White-tailed Eagle': 'Zeearend',
  'Peregrine Falcon': 'Slechtvalk'
};

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
      dutchName: COMMON_BIRDS_NL[obs.comName] || null, // Voeg Nederlandse naam toe indien beschikbaar
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
 * Haalt een afbeelding URL op voor een vogelsoort
 * @param {string} speciesName - Naam van de vogelsoort (Engels of wetenschappelijk)
 * @returns {Promise<string>} - URL naar een afbeelding van de vogelsoort
 */
export const getBirdImageUrl = async (speciesName) => {
  try {
    // Controleer of er een gecachte afbeelding is
    const cacheKey = `bird_image_${speciesName.replace(/\s+/g, '_').toLowerCase()}`;
    const cachedUrl = localStorage.getItem(cacheKey);
    
    if (cachedUrl) {
      return cachedUrl;
    }
    
    // Gebruik de Flickr API om een afbeelding te zoeken
    // We zoeken op de wetenschappelijke naam voor betere resultaten
    const searchTerm = encodeURIComponent(`${speciesName} bird`);
    const flickrUrl = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=3cffcc97867ea6acf8e7d6c4b7c21d96&text=${searchTerm}&sort=relevance&per_page=1&page=1&format=json&nojsoncallback=1&license=1,2,3,4,5,6,7`;
    
    const response = await fetch(flickrUrl);
    
    if (!response.ok) {
      throw new Error('Kon geen afbeelding ophalen');
    }
    
    const data = await response.json();
    
    if (data.photos && data.photos.photo && data.photos.photo.length > 0) {
      const photo = data.photos.photo[0];
      const imageUrl = `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`;
      
      // Sla de URL op in de cache
      localStorage.setItem(cacheKey, imageUrl);
      
      return imageUrl;
    }
    
    // Fallback naar een generieke afbeelding
    return null;
  } catch (error) {
    console.error('Fout bij het ophalen van vogelafbeelding:', error);
    return null;
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
      dutchName: COMMON_BIRDS_NL[data.comName] || null, // Voeg Nederlandse naam toe indien beschikbaar
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
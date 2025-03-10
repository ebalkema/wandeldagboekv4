// OpenWeatherMap API service
// Je moet een API key aanvragen op https://openweathermap.org/
const API_KEY = '7df2ecfe5339a8536cea033a0f1f210b';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Lokale weerafbeeldingen
const WEATHER_ICON_BASE_PATH = '/img/weather/';

// Lokale weerafbeeldingen voor fallback
const WEATHER_ICONS = {
  '01d': '☀️', // Heldere hemel (dag)
  '01n': '🌙', // Heldere hemel (nacht)
  '02d': '🌤️', // Licht bewolkt (dag)
  '02n': '☁️', // Licht bewolkt (nacht)
  '03d': '☁️', // Bewolkt (dag)
  '03n': '☁️', // Bewolkt (nacht)
  '04d': '☁️', // Zwaar bewolkt (dag)
  '04n': '☁️', // Zwaar bewolkt (nacht)
  '09d': '🌧️', // Lichte regen (dag)
  '09n': '🌧️', // Lichte regen (nacht)
  '10d': '🌦️', // Regen (dag)
  '10n': '🌧️', // Regen (nacht)
  '11d': '⛈️', // Onweer (dag)
  '11n': '⛈️', // Onweer (nacht)
  '13d': '❄️', // Sneeuw (dag)
  '13n': '❄️', // Sneeuw (nacht)
  '50d': '🌫️', // Mist (dag)
  '50n': '🌫️', // Mist (nacht)
  'default': '🌡️' // Standaard
};

/**
 * Haalt weergegevens op voor een specifieke locatie
 * @param {number} lat - Breedtegraad
 * @param {number} lon - Lengtegraad
 * @returns {Promise<Object>} - Weergegevens
 */
export const getWeatherData = async (lat, lon) => {
  try {
    // Gebruik een timeout van 5 seconden voor de fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&lang=nl&appid=${API_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Kon weergegevens niet ophalen: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Formatteer de weergegevens
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      emoji: WEATHER_ICONS[data.weather[0].icon] || WEATHER_ICONS.default,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Fout bij het ophalen van weergegevens:', error);
    
    // Fallback weergegevens
    return {
      temperature: 15,
      description: 'Weergegevens niet beschikbaar',
      icon: 'default',
      emoji: WEATHER_ICONS.default,
      humidity: 0,
      windSpeed: 0,
      timestamp: new Date().toISOString(),
      isOffline: true
    };
  }
};

/**
 * Haalt een URL op voor het weericoon
 * @param {string} iconCode - OpenWeatherMap icooncode
 * @returns {string} - URL naar het weericoon
 */
export const getWeatherIconUrl = (iconCode) => {
  // Controleer of de iconCode geldig is
  if (!iconCode || iconCode === 'default') {
    return null;
  }
  
  // Gebruik lokale weerafbeeldingen
  return `${WEATHER_ICON_BASE_PATH}${iconCode}.png`;
};

/**
 * Haalt weergegevens op uit de cache of van de API
 * @param {number} lat - Breedtegraad
 * @param {number} lon - Lengtegraad
 * @returns {Promise<Object>} - Weergegevens
 */
export const getCachedWeatherData = async (lat, lon) => {
  // Controleer of er recente weergegevens in de cache staan
  const cachedWeather = localStorage.getItem('weatherCache');
  
  if (cachedWeather) {
    try {
      const { data, timestamp, coords } = JSON.parse(cachedWeather);
      const now = new Date().getTime();
      const cacheTime = new Date(timestamp).getTime();
      
      // Controleer of de cache niet ouder is dan 30 minuten en of de locatie ongeveer hetzelfde is
      const isRecent = (now - cacheTime) < 30 * 60 * 1000;
      const isSameLocation = 
        Math.abs(coords.lat - lat) < 0.01 && 
        Math.abs(coords.lon - lon) < 0.01;
      
      if (isRecent && isSameLocation) {
        return data;
      }
    } catch (error) {
      console.error('Fout bij het lezen van de weercache:', error);
      // Bij een fout in de cache, verwijder de cache en haal nieuwe gegevens op
      localStorage.removeItem('weatherCache');
    }
  }
  
  // Haal nieuwe weergegevens op
  const weatherData = await getWeatherData(lat, lon);
  
  // Sla de weergegevens op in de cache
  if (weatherData) {
    try {
      localStorage.setItem('weatherCache', JSON.stringify({
        data: weatherData,
        timestamp: new Date().toISOString(),
        coords: { lat, lon }
      }));
    } catch (error) {
      console.error('Fout bij het opslaan van de weercache:', error);
    }
  }
  
  return weatherData;
}; 
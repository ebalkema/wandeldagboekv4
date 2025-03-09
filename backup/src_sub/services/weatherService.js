// OpenWeatherMap API service
// Je moet een API key aanvragen op https://openweathermap.org/
const API_KEY = '7df2ecfe5339a8536cea033a0f1f210b';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Haalt weergegevens op voor een specifieke locatie
 * @param {number} lat - Breedtegraad
 * @param {number} lon - Lengtegraad
 * @returns {Promise<Object>} - Weergegevens
 */
export const getWeatherData = async (lat, lon) => {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&lang=nl&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Kon weergegevens niet ophalen');
    }
    
    const data = await response.json();
    
    // Formatteer de weergegevens
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Fout bij het ophalen van weergegevens:', error);
    return null;
  }
};

/**
 * Haalt een URL op voor het weericoon
 * @param {string} iconCode - OpenWeatherMap icooncode
 * @returns {string} - URL naar het weericoon
 */
export const getWeatherIconUrl = (iconCode) => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
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
  }
  
  // Haal nieuwe weergegevens op
  const weatherData = await getWeatherData(lat, lon);
  
  // Sla de weergegevens op in de cache
  if (weatherData) {
    localStorage.setItem('weatherCache', JSON.stringify({
      data: weatherData,
      timestamp: new Date().toISOString(),
      coords: { lat, lon }
    }));
  }
  
  return weatherData;
}; 
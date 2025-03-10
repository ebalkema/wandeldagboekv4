const functions = require('firebase-functions');
const fetch = require('node-fetch');

/**
 * Proxy voor weerafbeeldingen van OpenWeatherMap
 * Deze functie lost CORS-problemen op door de afbeeldingen via de server te laden
 */
exports.weatherIcon = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Controleer of er een icon parameter is
  const iconCode = req.query.icon;
  if (!iconCode) {
    res.status(400).send('Missing icon parameter');
    return;
  }
  
  try {
    // Haal de afbeelding op van OpenWeatherMap
    const response = await fetch(`https://openweathermap.org/img/wn/${iconCode}@2x.png`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${response.status} ${response.statusText}`);
    }
    
    // Haal de afbeeldingsdata op
    const imageBuffer = await response.buffer();
    
    // Stel de juiste headers in
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache voor 24 uur
    
    // Stuur de afbeelding terug
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error fetching weather icon:', error);
    res.status(500).send('Error fetching weather icon');
  }
}); 
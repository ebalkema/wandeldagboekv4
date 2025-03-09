/**
 * Service voor integratie met Apple Journal Suggestions API
 * 
 * Deze service biedt functionaliteit om wandelingen en observaties
 * als suggesties aan te bieden voor de Apple Journal app op iOS-apparaten.
 * 
 * Opmerking: Deze API is alleen beschikbaar op iOS 17.2+ apparaten.
 */

// Controleer of de Journal API beschikbaar is
const isJournalApiAvailable = () => {
  return typeof window !== 'undefined' && 
         window.webkit && 
         window.webkit.messageHandlers && 
         window.webkit.messageHandlers.journalSuggestions;
};

/**
 * Biedt een wandeling aan als suggestie voor Apple Journal
 * @param {Object} walk - De wandeling om aan te bieden
 * @param {Array} observations - De observaties van de wandeling
 * @returns {Promise<boolean>} - True als succesvol, anders false
 */
export const suggestWalkToJournal = async (walk, observations = []) => {
  if (!isJournalApiAvailable()) {
    console.log('Apple Journal Suggestions API is niet beschikbaar op dit apparaat');
    return false;
  }

  try {
    // Bereid de locatiegegevens voor
    const locationData = walk.pathPoints && walk.pathPoints.length > 0 
      ? {
          latitude: walk.pathPoints[0].lat,
          longitude: walk.pathPoints[0].lng,
          name: 'Wandellocatie'
        }
      : null;

    // Bereid de afbeeldingen voor
    const images = [];
    observations.forEach(obs => {
      if (obs.mediaUrls && obs.mediaUrls.length > 0) {
        obs.mediaUrls.forEach(url => {
          images.push({
            url: url,
            title: obs.category || 'Observatie'
          });
        });
      }
    });

    // Bereid de tekst voor
    let content = `Wandeling: ${walk.name}\n\n`;
    
    if (walk.distance) {
      content += `Afstand: ${(walk.distance / 1000).toFixed(2)} km\n`;
    }
    
    if (walk.startTime && walk.endTime) {
      const startDate = new Date(walk.startTime.seconds * 1000);
      const endDate = new Date(walk.endTime.seconds * 1000);
      const durationMinutes = Math.round((endDate - startDate) / (1000 * 60));
      content += `Duur: ${Math.floor(durationMinutes / 60)}u ${durationMinutes % 60}m\n`;
    }
    
    content += '\nObservaties:\n';
    observations.forEach((obs, index) => {
      content += `${index + 1}. ${obs.category || 'Observatie'}: ${obs.text}\n`;
    });

    // Creëer de suggestie payload
    const suggestion = {
      type: 'journalSuggestion',
      title: walk.name,
      body: content,
      date: walk.startTime ? new Date(walk.startTime.seconds * 1000).toISOString() : new Date().toISOString(),
      location: locationData,
      images: images
    };

    // Stuur de suggestie naar de Journal app
    return new Promise((resolve) => {
      window.webkit.messageHandlers.journalSuggestions.postMessage(suggestion);
      // Aangezien we geen directe callback krijgen, nemen we aan dat het succesvol was
      resolve(true);
    });
  } catch (error) {
    console.error('Fout bij het suggereren aan Apple Journal:', error);
    return false;
  }
};

/**
 * Biedt een observatie aan als suggestie voor Apple Journal
 * @param {Object} observation - De observatie om aan te bieden
 * @returns {Promise<boolean>} - True als succesvol, anders false
 */
export const suggestObservationToJournal = async (observation) => {
  if (!isJournalApiAvailable()) {
    console.log('Apple Journal Suggestions API is niet beschikbaar op dit apparaat');
    return false;
  }

  try {
    // Bereid de locatiegegevens voor
    const locationData = observation.location 
      ? {
          latitude: observation.location.lat,
          longitude: observation.location.lng,
          name: observation.category || 'Observatielocatie'
        }
      : null;

    // Bereid de afbeeldingen voor
    const images = [];
    if (observation.mediaUrls && observation.mediaUrls.length > 0) {
      observation.mediaUrls.forEach(url => {
        images.push({
          url: url,
          title: observation.category || 'Observatie'
        });
      });
    }

    // Creëer de suggestie payload
    const suggestion = {
      type: 'journalSuggestion',
      title: observation.category || 'Observatie tijdens wandeling',
      body: observation.text,
      date: observation.timestamp ? new Date(observation.timestamp.seconds * 1000).toISOString() : new Date().toISOString(),
      location: locationData,
      images: images
    };

    // Stuur de suggestie naar de Journal app
    return new Promise((resolve) => {
      window.webkit.messageHandlers.journalSuggestions.postMessage(suggestion);
      // Aangezien we geen directe callback krijgen, nemen we aan dat het succesvol was
      resolve(true);
    });
  } catch (error) {
    console.error('Fout bij het suggereren aan Apple Journal:', error);
    return false;
  }
};

/**
 * Controleert of de Apple Journal Suggestions API beschikbaar is op dit apparaat
 * @returns {boolean} - True als beschikbaar, anders false
 */
export const checkJournalApiSupport = () => {
  return isJournalApiAvailable();
}; 
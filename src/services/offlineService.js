/**
 * Service voor offline functionaliteit
 * 
 * Deze service biedt functionaliteit voor het opslaan en synchroniseren
 * van wandelingen en observaties wanneer de gebruiker offline is.
 */
import { addObservation, createWalk, endWalk, updateWalk } from './firestoreService';

// Sleutels voor lokale opslag
const OFFLINE_WALKS_KEY = 'offlineWalks';
const OFFLINE_OBSERVATIONS_KEY = 'offlineObservations';
const PENDING_SYNC_KEY = 'pendingSyncItems';

/**
 * Controleert of de gebruiker online is
 * @returns {boolean} - True als online, anders false
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Slaat een wandeling op voor offline gebruik
 * @param {Object} walkData - De wandelgegevens
 * @returns {string} - Een tijdelijke ID voor de wandeling
 */
export const saveOfflineWalk = (walkData) => {
  // Genereer een tijdelijke ID
  const tempId = `temp_${Date.now()}`;
  
  // Haal bestaande offline wandelingen op
  const offlineWalks = JSON.parse(localStorage.getItem(OFFLINE_WALKS_KEY) || '[]');
  
  // Voeg de nieuwe wandeling toe
  const walkWithTempId = {
    ...walkData,
    id: tempId,
    tempId,
    pendingSync: true,
    createdAt: new Date().toISOString()
  };
  
  offlineWalks.push(walkWithTempId);
  
  // Sla op in localStorage
  localStorage.setItem(OFFLINE_WALKS_KEY, JSON.stringify(offlineWalks));
  
  // Voeg toe aan de synchronisatiewachtrij
  addToPendingSync('walk', 'create', walkWithTempId);
  
  return tempId;
};

/**
 * Slaat een observatie op voor offline gebruik
 * @param {Object} observationData - De observatiegegevens
 * @returns {string} - Een tijdelijke ID voor de observatie
 */
export const saveOfflineObservation = (observationData) => {
  // Genereer een tijdelijke ID
  const tempId = `temp_${Date.now()}`;
  
  // Haal bestaande offline observaties op
  const offlineObservations = JSON.parse(localStorage.getItem(OFFLINE_OBSERVATIONS_KEY) || '[]');
  
  // Voeg de nieuwe observatie toe
  const observationWithTempId = {
    ...observationData,
    id: tempId,
    tempId,
    pendingSync: true,
    createdAt: new Date().toISOString()
  };
  
  offlineObservations.push(observationWithTempId);
  
  // Sla op in localStorage
  localStorage.setItem(OFFLINE_OBSERVATIONS_KEY, JSON.stringify(offlineObservations));
  
  // Voeg toe aan de synchronisatiewachtrij
  addToPendingSync('observation', 'create', observationWithTempId);
  
  return tempId;
};

/**
 * Update een offline wandeling
 * @param {string} walkId - ID van de wandeling
 * @param {Object} updateData - Gegevens om bij te werken
 * @returns {boolean} - True als succesvol, anders false
 */
export const updateOfflineWalk = (walkId, updateData) => {
  // Haal bestaande offline wandelingen op
  const offlineWalks = JSON.parse(localStorage.getItem(OFFLINE_WALKS_KEY) || '[]');
  
  // Zoek de wandeling
  const walkIndex = offlineWalks.findIndex(walk => walk.id === walkId);
  
  if (walkIndex === -1) return false;
  
  // Update de wandeling
  offlineWalks[walkIndex] = {
    ...offlineWalks[walkIndex],
    ...updateData,
    pendingSync: true,
    updatedAt: new Date().toISOString()
  };
  
  // Sla op in localStorage
  localStorage.setItem(OFFLINE_WALKS_KEY, JSON.stringify(offlineWalks));
  
  // Voeg toe aan de synchronisatiewachtrij
  addToPendingSync('walk', 'update', {
    id: walkId,
    ...updateData
  });
  
  return true;
};

/**
 * Beëindigt een offline wandeling
 * @param {string} walkId - ID van de wandeling
 * @param {Object} endLocation - Eindlocatie {lat, lng}
 * @param {number} distance - Afgelegde afstand in meters
 * @param {Array} pathPoints - Array van locatiepunten
 */
export const endOfflineWalk = (walkId, endLocation, distance, pathPoints = null) => {
  try {
    // Haal bestaande wandelingen op
    const walks = getOfflineWalks();
    
    // Zoek de wandeling
    const walkIndex = walks.findIndex(walk => walk.id === walkId);
    
    if (walkIndex !== -1) {
      // Update de wandeling
      walks[walkIndex].endTime = new Date().toISOString();
      walks[walkIndex].endLocation = endLocation;
      walks[walkIndex].distance = distance;
      walks[walkIndex].pendingSync = true;
      
      // Voeg pathPoints toe als deze zijn meegegeven
      if (pathPoints) {
        walks[walkIndex].pathPoints = pathPoints;
      }
      
      // Sla op in localStorage
      localStorage.setItem('offlineWalks', JSON.stringify(walks));
      
      console.log('Offline wandeling beëindigd:', walkId);
    } else {
      console.error('Offline wandeling niet gevonden:', walkId);
    }
  } catch (error) {
    console.error('Fout bij het beëindigen van offline wandeling:', error);
  }
};

/**
 * Haal een offline wandeling op
 * @param {string} walkId - ID van de wandeling
 * @returns {Object|null} - De wandeling of null als niet gevonden
 */
export const getOfflineWalk = (walkId) => {
  // Haal bestaande offline wandelingen op
  const offlineWalks = JSON.parse(localStorage.getItem(OFFLINE_WALKS_KEY) || '[]');
  
  // Zoek de wandeling
  return offlineWalks.find(walk => walk.id === walkId) || null;
};

/**
 * Haal alle offline wandelingen op
 * @returns {Array} - Lijst met offline wandelingen
 */
export const getOfflineWalks = () => {
  return JSON.parse(localStorage.getItem(OFFLINE_WALKS_KEY) || '[]');
};

/**
 * Haal offline observaties op voor een wandeling
 * @param {string} walkId - ID van de wandeling
 * @returns {Array} - Lijst met offline observaties
 */
export const getOfflineObservations = (walkId) => {
  const offlineObservations = JSON.parse(localStorage.getItem(OFFLINE_OBSERVATIONS_KEY) || '[]');
  return offlineObservations.filter(obs => obs.walkId === walkId);
};

/**
 * Voeg een item toe aan de synchronisatiewachtrij
 * @param {string} type - Type item ('walk' of 'observation')
 * @param {string} action - Actie ('create', 'update', 'delete')
 * @param {Object} data - Gegevens van het item
 */
const addToPendingSync = (type, action, data) => {
  const pendingSyncItems = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  
  pendingSyncItems.push({
    type,
    action,
    data,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingSyncItems));
};

/**
 * Synchroniseer alle offline items met de server
 * @returns {Promise<{success: boolean, syncedItems: number, errors: number}>}
 */
export const syncOfflineItems = async () => {
  if (!isOnline()) {
    return { success: false, syncedItems: 0, errors: 0, message: 'Geen internetverbinding' };
  }
  
  const pendingSyncItems = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  
  if (pendingSyncItems.length === 0) {
    return { success: true, syncedItems: 0, errors: 0, message: 'Geen items om te synchroniseren' };
  }
  
  let syncedItems = 0;
  let errors = 0;
  let successfulItems = [];
  
  // Sorteer items op type en timestamp
  const sortedItems = [...pendingSyncItems].sort((a, b) => {
    // Wandelingen eerst
    if (a.type !== b.type) {
      return a.type === 'walk' ? -1 : 1;
    }
    // Dan op timestamp
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
  
  // ID-mapping voor tijdelijke naar echte ID's
  const idMapping = {};
  
  // Synchroniseer elk item
  for (const item of sortedItems) {
    try {
      console.log(`Synchroniseren van ${item.type} (${item.action}):`, item.data);
      
      if (item.type === 'walk') {
        if (item.action === 'create') {
          // Vervang tijdelijke ID's in pathPoints
          if (item.data.pathPoints) {
            item.data.pathPoints = item.data.pathPoints.map(point => ({
              lat: point.lat,
              lng: point.lng
            }));
          }
          
          try {
            // Maak de wandeling aan in Firestore
            const walkId = await createWalk(
              item.data.userId,
              item.data.name,
              item.data.startLocation,
              item.data.weather
            );
            
            console.log(`Wandeling aangemaakt in Firestore met ID: ${walkId}`);
            
            // Sla de ID-mapping op
            idMapping[item.data.tempId] = walkId;
            
            // Als de wandeling al beëindigd is, update deze
            if (item.data.endTime) {
              await endWalk(
                walkId,
                item.data.endLocation,
                item.data.distance
              );
              console.log(`Wandeling ${walkId} gemarkeerd als beëindigd`);
            }
            
            // Als er pathPoints zijn, update deze
            if (item.data.pathPoints && item.data.pathPoints.length > 0) {
              await updateWalk(walkId, {
                pathPoints: item.data.pathPoints
              });
              console.log(`PathPoints bijgewerkt voor wandeling ${walkId}`);
            }
            
            syncedItems++;
            successfulItems.push(item);
          } catch (error) {
            console.error('Fout bij het aanmaken van wandeling in Firestore:', error);
            errors++;
          }
        } else if (item.action === 'update') {
          try {
            // Gebruik de echte ID als beschikbaar
            const realId = idMapping[item.data.id] || item.data.id;
            
            // Update de wandeling in Firestore
            await updateWalk(realId, item.data);
            console.log(`Wandeling ${realId} bijgewerkt in Firestore`);
            
            syncedItems++;
            successfulItems.push(item);
          } catch (error) {
            console.error('Fout bij het updaten van wandeling in Firestore:', error);
            errors++;
          }
        }
      } else if (item.type === 'observation') {
        if (item.action === 'create') {
          try {
            // Gebruik de echte wandeling-ID als beschikbaar
            const realWalkId = idMapping[item.data.walkId] || item.data.walkId;
            
            // Maak de observatie aan in Firestore
            const observationId = await addObservation(
              realWalkId,
              item.data.userId,
              item.data.text,
              item.data.location,
              item.data.category,
              item.data.weatherAtPoint
            );
            
            console.log(`Observatie aangemaakt in Firestore met ID: ${observationId} voor wandeling ${realWalkId}`);
            
            syncedItems++;
            successfulItems.push(item);
          } catch (error) {
            console.error('Fout bij het aanmaken van observatie in Firestore:', error);
            errors++;
          }
        }
      }
    } catch (error) {
      console.error('Algemene fout bij het synchroniseren van item:', error, item);
      errors++;
    }
  }
  
  // Verwijder alleen gesynchroniseerde items uit de wachtrij
  if (successfulItems.length > 0) {
    // Filter de gesynchroniseerde items uit de wachtrij
    const remainingItems = pendingSyncItems.filter(item => 
      !successfulItems.some(successItem => 
        successItem.type === item.type && 
        successItem.action === item.action && 
        successItem.data.id === item.data.id
      )
    );
    
    // Update de wachtrij in localStorage
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remainingItems));
    
    // Update de offline wandelingen en observaties
    updateOfflineItemsAfterSync(idMapping);
    
    console.log(`${successfulItems.length} items gesynchroniseerd, ${remainingItems.length} items nog in wachtrij`);
  }
  
  return { 
    success: errors === 0, 
    syncedItems, 
    errors,
    message: `${syncedItems} items gesynchroniseerd, ${errors} fouten`
  };
};

/**
 * Update offline items na synchronisatie
 * @param {Object} idMapping - Mapping van tijdelijke naar echte ID's
 */
const updateOfflineItemsAfterSync = (idMapping) => {
  if (Object.keys(idMapping).length === 0) return;
  
  // Update offline wandelingen
  const offlineWalks = JSON.parse(localStorage.getItem(OFFLINE_WALKS_KEY) || '[]');
  const updatedWalks = offlineWalks.map(walk => {
    if (idMapping[walk.tempId]) {
      // Deze wandeling is gesynchroniseerd, update de ID
      return {
        ...walk,
        id: idMapping[walk.tempId],
        pendingSync: false
      };
    }
    return walk;
  });
  localStorage.setItem(OFFLINE_WALKS_KEY, JSON.stringify(updatedWalks));
  
  // Update offline observaties
  const offlineObservations = JSON.parse(localStorage.getItem(OFFLINE_OBSERVATIONS_KEY) || '[]');
  const updatedObservations = offlineObservations.map(obs => {
    if (idMapping[obs.walkId]) {
      // Deze observatie hoort bij een gesynchroniseerde wandeling, update de walkId
      return {
        ...obs,
        walkId: idMapping[obs.walkId],
        pendingSync: false
      };
    }
    return obs;
  });
  localStorage.setItem(OFFLINE_OBSERVATIONS_KEY, JSON.stringify(updatedObservations));
};

/**
 * Registreer event listeners voor online/offline status
 * @param {Function} onOnline - Callback wanneer online
 * @param {Function} onOffline - Callback wanneer offline
 */
export const registerConnectivityListeners = (onOnline, onOffline) => {
  window.addEventListener('online', () => {
    console.log('Online status: verbonden');
    if (onOnline) onOnline();
  });
  
  window.addEventListener('offline', () => {
    console.log('Online status: niet verbonden');
    if (onOffline) onOffline();
  });
};

/**
 * Controleer of er items zijn die gesynchroniseerd moeten worden
 * @returns {boolean} - True als er items zijn, anders false
 */
export const hasPendingSyncItems = () => {
  const pendingSyncItems = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  return pendingSyncItems.length > 0;
};

/**
 * Aantal items dat gesynchroniseerd moet worden
 * @returns {number} - Aantal items
 */
export const getPendingSyncCount = () => {
  const pendingSyncItems = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  return pendingSyncItems.length;
}; 
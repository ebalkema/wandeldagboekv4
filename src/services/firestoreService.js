import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { auth } from '../firebase';

/**
 * Service voor het werken met Firebase Firestore
 */

/**
 * Haalt een gebruiker op uit Firestore
 * @param {string} userId - ID van de gebruiker
 * @returns {Promise<Object>} - Gebruikersgegevens
 */
export const getUser = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Fout bij het ophalen van gebruiker:', error);
    throw error;
  }
};

/**
 * Haalt gebruikersinstellingen op
 * @param {string} userId - ID van de gebruiker
 * @returns {Promise<Object>} - Gebruikersinstellingen
 */
export const getUserSettings = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists() && userDoc.data().settings) {
      return userDoc.data().settings;
    }
    
    return null;
  } catch (error) {
    console.error('Fout bij het ophalen van gebruikersinstellingen:', error);
    throw error;
  }
};

/**
 * Update gebruikersinstellingen
 * @param {string} userId - ID van de gebruiker
 * @param {Object} settings - Nieuwe instellingen
 * @returns {Promise<void>}
 */
export const updateUserSettings = async (userId, settings) => {
  try {
    // Controleer of het document bestaat
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Document bestaat niet, maak het aan
      await setDoc(userDocRef, {
        userId: userId,
        settings: settings,
        createdAt: serverTimestamp()
      });
      console.log('Gebruikersdocument aangemaakt voor:', userId);
    } else {
      // Document bestaat, update alleen de instellingen
      await updateDoc(userDocRef, {
        settings: settings
      });
    }
  } catch (error) {
    console.error('Fout bij het updaten van gebruikersinstellingen:', error);
    throw error;
  }
};

/**
 * Update gebruikersprofiel
 * @param {string} userId - ID van de gebruiker
 * @param {Object} profileData - Nieuwe profielgegevens
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, profileData);
  } catch (error) {
    console.error('Fout bij het updaten van gebruikersprofiel:', error);
    throw error;
  }
};

/**
 * Verwijder alle gebruikersgegevens
 * @param {string} userId - ID van de gebruiker
 * @returns {Promise<void>}
 */
export const deleteUserData = async (userId) => {
  try {
    const batch = writeBatch(db);
    
    // Verwijder gebruikersdocument
    const userDocRef = doc(db, 'users', userId);
    batch.delete(userDocRef);
    
    // Haal alle wandelingen op
    const walksQuery = query(collection(db, 'walks'), where('userId', '==', userId));
    const walksSnapshot = await getDocs(walksQuery);
    
    // Verwijder alle wandelingen en bijbehorende observaties
    for (const walkDoc of walksSnapshot.docs) {
      const walkId = walkDoc.id;
      
      // Haal alle observaties op
      const observationsQuery = query(collection(db, 'observations'), where('walkId', '==', walkId));
      const observationsSnapshot = await getDocs(observationsQuery);
      
      // Verwijder alle observaties
      for (const obsDoc of observationsSnapshot.docs) {
        // Verwijder eventuele foto's
        if (obsDoc.data().photoURL) {
          try {
            const photoRef = ref(storage, obsDoc.data().photoURL);
            await deleteObject(photoRef);
          } catch (photoError) {
            console.error('Fout bij het verwijderen van foto:', photoError);
            // Ga door met verwijderen, ook als foto niet kan worden verwijderd
          }
        }
        
        batch.delete(obsDoc.ref);
      }
      
      // Verwijder de wandeling
      batch.delete(walkDoc.ref);
    }
    
    // Voer alle verwijderingen uit
    await batch.commit();
    
    console.log('Alle gebruikersgegevens verwijderd voor:', userId);
  } catch (error) {
    console.error('Fout bij het verwijderen van gebruikersgegevens:', error);
    throw error;
  }
};

/**
 * Verwijder alle wandelingen en observaties van een gebruiker
 * @param {string} userId - ID van de gebruiker
 * @returns {Promise<void>}
 */
export const deleteUserWalks = async (userId) => {
  try {
    const batch = writeBatch(db);
    
    // Haal alle wandelingen op
    const walksQuery = query(collection(db, 'walks'), where('userId', '==', userId));
    const walksSnapshot = await getDocs(walksQuery);
    
    // Verwijder alle wandelingen en bijbehorende observaties
    for (const walkDoc of walksSnapshot.docs) {
      const walkId = walkDoc.id;
      
      // Haal alle observaties op
      const observationsQuery = query(collection(db, 'observations'), where('walkId', '==', walkId));
      const observationsSnapshot = await getDocs(observationsQuery);
      
      // Verwijder alle observaties
      for (const obsDoc of observationsSnapshot.docs) {
        // Verwijder eventuele foto's
        if (obsDoc.data().photoURL) {
          try {
            const photoRef = ref(storage, obsDoc.data().photoURL);
            await deleteObject(photoRef);
          } catch (photoError) {
            console.error('Fout bij het verwijderen van foto:', photoError);
            // Ga door met verwijderen, ook als foto niet kan worden verwijderd
          }
        }
        
        batch.delete(obsDoc.ref);
      }
      
      // Verwijder de wandeling
      batch.delete(walkDoc.ref);
    }
    
    // Voer alle verwijderingen uit
    await batch.commit();
    
    console.log('Alle wandelingen en observaties verwijderd voor:', userId);
  } catch (error) {
    console.error('Fout bij het verwijderen van wandelingen en observaties:', error);
    throw error;
  }
};

/**
 * Maakt een nieuwe wandeling aan
 * @param {Object} walkData - Gegevens voor de nieuwe wandeling
 * @param {string} walkData.userId - ID van de gebruiker
 * @param {string} walkData.name - Naam van de wandeling
 * @param {Object} walkData.startLocation - Startlocatie {lat, lng}
 * @param {Object} walkData.weather - Weergegevens
 * @param {Date|null} walkData.startTime - Starttijd (optioneel, standaard serverTimestamp)
 * @returns {Promise<string>} - ID van de nieuwe wandeling
 */
export const createWalk = async (walkData) => {
  try {
    const { userId, name, startLocation, weather, startTime } = walkData;
    
    if (!userId) {
      throw new Error('userId is vereist');
    }
    
    if (!name) {
      throw new Error('name is vereist');
    }
    
    if (!startLocation) {
      throw new Error('startLocation is vereist');
    }
    
    const walkDoc = {
      userId,
      name,
      startTime: startTime || serverTimestamp(),
      endTime: null,
      startLocation,
      endLocation: null,
      pathPoints: [startLocation],
      weather,
      distance: 0,
      observationCount: 0
    };
    
    const docRef = await addDoc(collection(db, 'walks'), walkDoc);
    return docRef.id;
  } catch (error) {
    console.error('Fout bij het aanmaken van wandeling:', error);
    throw error;
  }
};

/**
 * Update een wandeling
 * @param {string} walkId - ID van de wandeling
 * @param {Object} data - Gegevens om te updaten
 * @returns {Promise<void>}
 */
export const updateWalk = async (walkId, data) => {
  try {
    await updateDoc(doc(db, 'walks', walkId), data);
  } catch (error) {
    console.error('Fout bij het updaten van wandeling:', error);
    throw error;
  }
};

/**
 * Beëindigt een wandeling
 * @param {string} walkId - ID van de wandeling
 * @param {Object} endLocation - Eindlocatie {lat, lng}
 * @param {number} distance - Afgelegde afstand in meters
 * @param {Array} pathPoints - Array van locatiepunten
 * @returns {Promise<void>}
 */
export const endWalk = async (walkId, endLocation, distance, pathPoints = null) => {
  try {
    const updateData = {
      endTime: serverTimestamp(),
      endLocation,
      distance
    };
    
    // Voeg pathPoints toe als deze zijn meegegeven
    if (pathPoints) {
      updateData.pathPoints = pathPoints;
    }
    
    await updateDoc(doc(db, 'walks', walkId), updateData);
  } catch (error) {
    console.error('Fout bij het beëindigen van wandeling:', error);
    throw error;
  }
};

/**
 * Haalt een wandeling op
 * @param {string} walkId - ID van de wandeling
 * @returns {Promise<Object>} - Wandelgegevens
 */
export const getWalk = async (walkId) => {
  try {
    const walkDoc = await getDoc(doc(db, 'walks', walkId));
    
    if (walkDoc.exists()) {
      return { id: walkDoc.id, ...walkDoc.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Fout bij het ophalen van wandeling:', error);
    throw error;
  }
};

/**
 * Haalt wandelingen op voor een gebruiker
 * @param {string} userId - ID van de gebruiker
 * @param {number} limit - Maximum aantal wandelingen om op te halen
 * @returns {Promise<Array<Object>>} - Wandelingen
 */
export const getUserWalks = async (userId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, 'walks'),
      where('userId', '==', userId),
      orderBy('startTime', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Fout bij het ophalen van wandelingen:', error);
    throw error;
  }
};

/**
 * Voegt een observatie toe
 * @param {string} walkId - ID van de wandeling
 * @param {string} userId - ID van de gebruiker
 * @param {string} text - Tekst van de observatie
 * @param {Object} location - Locatie {lat, lng}
 * @param {string} category - Categorie van de observatie
 * @param {Object} weather - Weergegevens
 * @returns {Promise<string>} - ID van de nieuwe observatie
 */
export const addObservation = async (walkId, userId, text, location, category = 'algemeen', weather = null) => {
  try {
    const observationData = {
      walkId,
      userId,
      text,
      timestamp: serverTimestamp(),
      location,
      category,
      weatherAtPoint: weather,
      mediaUrls: []
    };
    
    const docRef = await addDoc(collection(db, 'observations'), observationData);
    
    // Update het aantal observaties in de wandeling
    const walkDoc = await getDoc(doc(db, 'walks', walkId));
    if (walkDoc.exists()) {
      const walkData = walkDoc.data();
      await updateDoc(doc(db, 'walks', walkId), {
        observationCount: (walkData.observationCount || 0) + 1
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Fout bij het toevoegen van observatie:', error);
    throw error;
  }
};

/**
 * Voegt een foto toe aan een observatie
 * @param {string} observationId - ID van de observatie
 * @param {File} file - Fotobestand
 * @returns {Promise<string>} - URL van de geüploade foto
 */
export const addPhotoToObservation = async (observationId, file) => {
  try {
    // Upload de foto naar Firebase Storage
    const storageRef = ref(storage, `observations/${observationId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    
    // Haal de download URL op
    const downloadURL = await getDownloadURL(storageRef);
    
    // Update de observatie met de nieuwe foto URL
    const observationDoc = await getDoc(doc(db, 'observations', observationId));
    if (observationDoc.exists()) {
      const observationData = observationDoc.data();
      const mediaUrls = observationData.mediaUrls || [];
      
      await updateDoc(doc(db, 'observations', observationId), {
        mediaUrls: [...mediaUrls, downloadURL]
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Fout bij het toevoegen van foto aan observatie:', error);
    throw error;
  }
};

/**
 * Haalt observaties op voor een wandeling
 * @param {string} walkId - ID van de wandeling
 * @returns {Promise<Array<Object>>} - Observaties
 */
export const getWalkObservations = async (walkId) => {
  try {
    const q = query(
      collection(db, 'observations'),
      where('walkId', '==', walkId),
      orderBy('timestamp', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Fout bij het ophalen van observaties:', error);
    throw error;
  }
};

/**
 * Haalt globale statistieken op van alle gebruikers
 * @returns {Promise<Object>} - Globale statistieken
 */
export const getGlobalStats = async () => {
  // Standaard fallback waarden
  const fallbackStats = {
    totalWalks: 6,
    totalDistance: 100000, // 100 km
    totalObservations: 24,
    totalUsers: 1
  };
  
  // Als de gebruiker niet is ingelogd, retourneer direct de fallback
  if (!auth.currentUser) {
    console.log('Geen ingelogde gebruiker, fallback statistieken worden gebruikt');
    return fallbackStats;
  }
  
  try {
    // Probeer eerst de wandelingen op te halen
    let totalWalks = 0;
    let totalDistance = 0;
    let walks = [];
    
    try {
      // Gebruik een limiet om de hoeveelheid opgehaalde data te beperken
      const walksQuery = query(collection(db, 'walks'), limit(100));
      const walksSnapshot = await getDocs(walksQuery);
      
      walks = walksSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      
      totalWalks = walksSnapshot.size;
      
      // Bereken de totale afstand
      totalDistance = walks.reduce((sum, walk) => {
        const distance = walk.distance !== undefined ? Number(walk.distance) : 0;
        return sum + distance;
      }, 0);
      
      console.log(`Succesvol ${totalWalks} wandelingen opgehaald voor statistieken`);
    } catch (walkError) {
      console.warn('Kon wandelingen niet ophalen voor statistieken:', walkError);
      // Gebruik fallback waarden
      totalWalks = fallbackStats.totalWalks;
      totalDistance = fallbackStats.totalDistance;
    }
    
    // Probeer gebruikers op te halen
    let totalUsers = 0;
    try {
      // Gebruik een limiet om de hoeveelheid opgehaalde data te beperken
      const usersQuery = query(collection(db, 'users'), limit(100));
      const usersSnapshot = await getDocs(usersQuery);
      totalUsers = usersSnapshot.size;
      
      console.log(`Succesvol ${totalUsers} gebruikers opgehaald voor statistieken`);
    } catch (userError) {
      console.warn('Kon gebruikers niet ophalen voor statistieken:', userError);
      // Gebruik fallback waarde
      totalUsers = fallbackStats.totalUsers;
    }
    
    // Probeer observaties op te halen
    let totalObservations = 0;
    try {
      // Gebruik een limiet om de hoeveelheid opgehaalde data te beperken
      const observationsQuery = query(collection(db, 'observations'), limit(100));
      const observationsSnapshot = await getDocs(observationsQuery);
      totalObservations = observationsSnapshot.size;
      
      console.log(`Succesvol ${totalObservations} observaties opgehaald voor statistieken`);
    } catch (obsError) {
      console.warn('Kon observaties niet ophalen voor statistieken:', obsError);
      // Gebruik fallback waarde
      totalObservations = fallbackStats.totalObservations;
    }
    
    // Als alle waarden gelijk zijn aan de fallback, gebruik dan de volledige fallback
    if (totalWalks === fallbackStats.totalWalks && 
        totalDistance === fallbackStats.totalDistance && 
        totalObservations === fallbackStats.totalObservations && 
        totalUsers === fallbackStats.totalUsers) {
      console.log('Alle statistieken gebruiken fallback waarden, volledige fallback wordt gebruikt');
      return fallbackStats;
    }
    
    // Log de berekende statistieken
    const stats = {
      totalWalks,
      totalDistance,
      totalObservations,
      totalUsers
    };
    
    console.log('Globale statistieken berekend:', stats);
    return stats;
  } catch (error) {
    console.error('Fout bij het ophalen van globale statistieken:', error);
    // Fallback statistieken als er een fout optreedt
    return fallbackStats;
  }
}; 
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
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

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
 * Update gebruikersinstellingen
 * @param {string} userId - ID van de gebruiker
 * @param {Object} settings - Nieuwe instellingen
 * @returns {Promise<void>}
 */
export const updateUserSettings = async (userId, settings) => {
  try {
    await updateDoc(doc(db, 'users', userId), { settings });
  } catch (error) {
    console.error('Fout bij het updaten van gebruikersinstellingen:', error);
    throw error;
  }
};

/**
 * Maakt een nieuwe wandeling aan
 * @param {string} userId - ID van de gebruiker
 * @param {string} name - Naam van de wandeling
 * @param {Object} startLocation - Startlocatie {lat, lng}
 * @param {Object} weather - Weergegevens
 * @returns {Promise<string>} - ID van de nieuwe wandeling
 */
export const createWalk = async (userId, name, startLocation, weather) => {
  try {
    const walkData = {
      userId,
      name,
      startTime: serverTimestamp(),
      endTime: null,
      startLocation,
      endLocation: null,
      pathPoints: [startLocation],
      weather,
      distance: 0,
      observationCount: 0
    };
    
    const docRef = await addDoc(collection(db, 'walks'), walkData);
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
 * @returns {Promise<void>}
 */
export const endWalk = async (walkId, endLocation, distance) => {
  try {
    await updateDoc(doc(db, 'walks', walkId), {
      endTime: serverTimestamp(),
      endLocation,
      distance
    });
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
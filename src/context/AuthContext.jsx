import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import * as firestoreService from '../services/firestoreService';

// Maak de AuthContext
const AuthContext = createContext();

// Hook om de AuthContext te gebruiken
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState({
    birdRadius: 10, // Standaard zoekradius voor vogelwaarnemingen (in km)
    // Andere gebruikersinstellingen kunnen hier worden toegevoegd
  });

  // Registreer een nieuwe gebruiker met email en wachtwoord
  const signup = async (email, password, displayName) => {
    try {
      // Maak een nieuwe gebruiker aan
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update het profiel met de displayName
      await updateFirebaseProfile(user, { displayName });
      
      // Maak een gebruikersdocument in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        displayName,
        createdAt: serverTimestamp(),
        settings: {
          birdRadius: 10 // Standaard zoekradius voor vogelwaarnemingen
        }
      });
      
      return user;
    } catch (error) {
      console.error('Fout bij registratie:', error);
      throw error;
    }
  };

  // Log in met email en wachtwoord
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Fout bij inloggen:', error);
      throw error;
    }
  };

  // Log in met Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Controleer of de gebruiker al bestaat in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Maak een nieuw gebruikersdocument als het nog niet bestaat
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          createdAt: serverTimestamp(),
          settings: {
            birdRadius: 10 // Standaard zoekradius voor vogelwaarnemingen
          }
        });
      }
      
      return user;
    } catch (error) {
      console.error('Fout bij inloggen met Google:', error);
      throw error;
    }
  };

  // Log uit
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Fout bij uitloggen:', error);
      throw error;
    }
  };

  // Reset wachtwoord
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Fout bij wachtwoord reset:', error);
      throw error;
    }
  };

  // Update gebruikersprofiel
  const updateProfile = async (displayName, photoURL) => {
    if (!currentUser) return;
    
    try {
      const updates = {};
      
      if (displayName) {
        updates.displayName = displayName;
        await updateFirebaseProfile(currentUser, { displayName });
      }
      
      if (photoURL) {
        updates.photoURL = photoURL;
        await updateFirebaseProfile(currentUser, { photoURL });
      }
      
      // Update Firestore document
      if (Object.keys(updates).length > 0) {
        await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
      }
      
      return true;
    } catch (error) {
      console.error('Fout bij het updaten van profiel:', error);
      return false;
    }
  };

  // Update gebruikersinstellingen
  const updateUserSettings = async (settings) => {
    if (!currentUser) return;
    
    try {
      // Update instellingen in Firestore
      await firestoreService.updateUserSettings(currentUser.uid, settings);
      
      // Update lokale state
      setUserSettings(prevSettings => ({
        ...prevSettings,
        ...settings
      }));
      
      return true;
    } catch (error) {
      console.error('Fout bij het updaten van gebruikersinstellingen:', error);
      return false;
    }
  };

  // Haal gebruikersinstellingen op bij inloggen
  const fetchUserSettings = async (userId) => {
    try {
      const settings = await firestoreService.getUserSettings(userId);
      
      if (settings) {
        setUserSettings(prevSettings => ({
          ...prevSettings,
          ...settings
        }));
      }
    } catch (error) {
      console.error('Fout bij het ophalen van gebruikersinstellingen:', error);
    }
  };

  // Luister naar auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Haal gebruikersinstellingen op
        await fetchUserSettings(user.uid);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Context waarde
  const value = {
    currentUser,
    userSettings,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateProfile,
    updateUserSettings
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 
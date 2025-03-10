import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail,
  deleteUser
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
    observationTags: ['Vogel', 'Plant', 'Dier', 'Insect', 'Landschap', 'Algemeen'] // Standaard observatie tags
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
          birdRadius: 10, // Standaard zoekradius voor vogelwaarnemingen
          observationTags: ['Vogel', 'Plant', 'Dier', 'Insect', 'Landschap', 'Algemeen'] // Standaard observatie tags
        }
      });
      
      return user;
    } catch (error) {
      console.error('Fout bij registreren:', error);
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
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Controleer of de gebruiker al bestaat in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Maak een nieuw gebruikersdocument als het nog niet bestaat
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          settings: {
            birdRadius: 10, // Standaard zoekradius voor vogelwaarnemingen
            observationTags: ['Vogel', 'Plant', 'Dier', 'Insect', 'Landschap', 'Algemeen'] // Standaard observatie tags
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

  // Stuur een wachtwoord reset email
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
      // Update Firebase Auth profiel
      await updateFirebaseProfile(currentUser, {
        displayName: displayName || currentUser.displayName,
        photoURL: photoURL || currentUser.photoURL
      });
      
      // Update Firestore document
      await firestoreService.updateUserProfile(currentUser.uid, {
        displayName: displayName || currentUser.displayName,
        photoURL: photoURL || currentUser.photoURL
      });
      
      // Ververs de currentUser
      setCurrentUser({
        ...currentUser,
        displayName: displayName || currentUser.displayName,
        photoURL: photoURL || currentUser.photoURL
      });
      
      return true;
    } catch (error) {
      console.error('Fout bij het updaten van profiel:', error);
      return false;
    }
  };

  // Verwijder gebruikersaccount
  const deleteAccount = async () => {
    if (!currentUser) {
      throw new Error('Geen ingelogde gebruiker');
    }
    
    try {
      // Verwijder het Firebase Authentication account
      await deleteUser(currentUser);
      return true;
    } catch (error) {
      console.error('Fout bij het verwijderen van account:', error);
      throw error;
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
    updateUserSettings,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 
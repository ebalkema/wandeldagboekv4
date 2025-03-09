import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

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

  // Registreer een nieuwe gebruiker met email en wachtwoord
  const signup = async (email, password, displayName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update het profiel met de displayName
      await updateProfile(user, { displayName });
      
      // Maak een gebruikersdocument in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        email,
        createdAt: serverTimestamp(),
        settings: {
          voiceCommandsEnabled: true,
          automaticWeatherEnabled: true
        }
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Log in met email en wachtwoord
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Log in met Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Controleer of de gebruiker al bestaat in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      // Als de gebruiker niet bestaat, maak een nieuw document aan
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName,
          email: user.email,
          createdAt: serverTimestamp(),
          settings: {
            voiceCommandsEnabled: true,
            automaticWeatherEnabled: true
          }
        });
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Log uit
  const logout = () => {
    return signOut(auth);
  };

  // Luister naar veranderingen in de authenticatiestatus
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Context waarde
  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserWalks, getGlobalStats, deleteUserData, deleteUserWalks } from '../services/firestoreService';
import { hasPendingSyncItems, syncOfflineItems, getPendingSyncCount } from '../services/offlineService';
import { FaSignOutAlt, FaSync, FaCog, FaInfoCircle, FaHeart, FaBinoculars, FaTrash, FaTags } from 'react-icons/fa';
import { FaCheck, FaExclamationTriangle, FaUsers, FaRoute, FaEye, FaMedal } from 'react-icons/fa';
import { FaFire } from 'react-icons/fa';

/**
 * Profielpagina voor gebruikersinstellingen en statistieken
 */
const ProfilePage = () => {
  const { currentUser, logout, userSettings, updateUserSettings, deleteAccount } = useAuth();
  const navigate = useNavigate();
  
  const [userStats, setUserStats] = useState({
    totalWalks: 0,
    totalDistance: 0,
    totalObservations: 0
  });
  const [globalStats, setGlobalStats] = useState({
    totalWalks: 0,
    totalDistance: 0,
    totalObservations: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showBirdSettings, setShowBirdSettings] = useState(false);
  const [birdRadius, setBirdRadius] = useState(userSettings?.birdRadius || 10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWalksDeleteConfirm, setShowWalksDeleteConfirm] = useState(false);
  const [showTagsSettings, setShowTagsSettings] = useState(false);
  const [observationTags, setObservationTags] = useState(userSettings?.observationTags || ['Vogel', 'Plant', 'Dier', 'Insect', 'Landschap', 'Algemeen']);
  const [newTag, setNewTag] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Haal gebruikersstatistieken op
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!currentUser) return;
      
      try {
        const walks = await getUserWalks(currentUser.uid, 100); // Verhoog limiet om alle wandelingen te krijgen
        
        // Bereken statistieken
        const totalWalks = walks.length;
        
        // Zorg ervoor dat we de afstand correct berekenen, ook als deze 0 is
        const totalDistance = walks.reduce((sum, walk) => {
          const distance = walk.distance !== undefined ? Number(walk.distance) : 0;
          return sum + distance;
        }, 0);
        
        // Tel het aantal observaties
        const totalObservations = walks.reduce((sum, walk) => {
          return sum + (walk.observationCount || 0);
        }, 0);
        
        setUserStats({
          totalWalks,
          totalDistance,
          totalObservations
        });
      } catch (error) {
        console.error('Fout bij het ophalen van gebruikersstatistieken:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [currentUser]);

  // Haal globale statistieken op
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const stats = await getGlobalStats();
        setGlobalStats(stats);
      } catch (error) {
        console.error('Fout bij het ophalen van globale statistieken:', error);
      }
    };
    
    fetchGlobalStats();
  }, []);

  // Controleer op offline items die gesynchroniseerd moeten worden
  useEffect(() => {
    setHasPendingItems(hasPendingSyncItems());
    setPendingCount(getPendingSyncCount());
  }, []);

  // Uitloggen
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Fout bij uitloggen:', error);
    }
  };

  // Synchroniseer offline items
  const handleSync = async () => {
    if (syncing) return;
    
    setSyncing(true);
    setSyncMessage('Bezig met synchroniseren naar Firestore...');
    setSyncSuccess(null);
    
    try {
      const result = await syncOfflineItems();
      setSyncMessage(result.message);
      setHasPendingItems(hasPendingSyncItems());
      setPendingCount(getPendingSyncCount());
      setSyncSuccess(result.success);
      
      // Verberg het bericht na 5 seconden als er geen fouten zijn
      if (result.success) {
        setTimeout(() => {
          setSyncMessage('');
          setSyncSuccess(null);
        }, 5000);
      }
    } catch (error) {
      setSyncMessage('Fout bij synchroniseren naar Firestore');
      setSyncSuccess(false);
      console.error('Synchronisatiefout:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Bereken gebruikerspercentage ten opzichte van globale statistieken
  const calculatePercentage = (userValue, globalValue) => {
    if (!globalValue) return 0;
    return Math.min(100, Math.round((userValue / globalValue) * 100));
  };

  // Update vogelwaarnemingen instellingen
  const handleBirdRadiusChange = (e) => {
    setBirdRadius(Number(e.target.value));
  };

  const handleSaveBirdSettings = async () => {
    try {
      await updateUserSettings({
        ...userSettings,
        birdRadius
      });
      
      setShowBirdSettings(false);
    } catch (error) {
      console.error('Fout bij het opslaan van vogelwaarnemingen instellingen:', error);
    }
  };

  // Verwijder gebruikersaccount en alle gegevens
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    try {
      setDeleting(true);
      
      // Verwijder alle gebruikersgegevens uit Firestore
      await deleteUserData(currentUser.uid);
      
      // Verwijder het Firebase Authentication account
      await deleteAccount();
      
      // Navigeer naar de login pagina
      navigate('/login');
    } catch (error) {
      console.error('Fout bij het verwijderen van account:', error);
      alert('Er is een fout opgetreden bij het verwijderen van je account. Probeer het later opnieuw.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Verwijder alleen wandelingen en observaties
  const handleDeleteWalks = async () => {
    if (!currentUser) return;
    
    try {
      setDeleting(true);
      
      // Verwijder alle wandelingen en observaties
      await deleteUserWalks(currentUser.uid);
      
      // Ververs de statistieken
      setUserStats({
        totalWalks: 0,
        totalDistance: 0,
        totalObservations: 0
      });
      
      setDeleting(false);
      setShowWalksDeleteConfirm(false);
      
      alert('Alle wandelingen en observaties zijn verwijderd.');
    } catch (error) {
      console.error('Fout bij het verwijderen van wandelingen:', error);
      alert('Er is een fout opgetreden bij het verwijderen van je wandelingen. Probeer het later opnieuw.');
      setDeleting(false);
      setShowWalksDeleteConfirm(false);
    }
  };

  // Beheer observatie tags
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    // Voeg de nieuwe tag toe als deze nog niet bestaat
    if (!observationTags.includes(newTag.trim())) {
      setObservationTags([...observationTags, newTag.trim()]);
    }
    
    setNewTag('');
  };

  const handleRemoveTag = (tag) => {
    setObservationTags(observationTags.filter(t => t !== tag));
  };

  const handleSaveTagsSettings = async () => {
    try {
      await updateUserSettings({
        ...userSettings,
        observationTags
      });
      
      setShowTagsSettings(false);
    } catch (error) {
      console.error('Fout bij het opslaan van observatie tags:', error);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Gebruikersinfo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-700 rounded-full p-3 mr-4">
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'Gebruiker'} 
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
                {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold">
              {currentUser?.displayName || 'Wandelaar'}
            </h2>
            <p className="text-gray-600">{currentUser?.email}</p>
          </div>
        </div>
        
        {/* Persoonlijke Statistieken */}
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Jouw statistieken</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{userStats.totalWalks}</p>
            <p className="text-sm text-gray-600">Wandelingen</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{formatDistance(userStats.totalDistance)}</p>
            <p className="text-sm text-gray-600">Afstand</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-600">{userStats.totalObservations}</p>
            <p className="text-sm text-gray-600">Observaties</p>
          </div>
        </div>
        
        {/* Vergelijking met andere gebruikers */}
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Jouw bijdrage</h3>
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Wandelingen</span>
              <span className="text-gray-800 font-medium">{calculatePercentage(userStats.totalWalks, globalStats.totalWalks)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${calculatePercentage(userStats.totalWalks, globalStats.totalWalks)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Afstand</span>
              <span className="text-gray-800 font-medium">{calculatePercentage(userStats.totalDistance, globalStats.totalDistance)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${calculatePercentage(userStats.totalDistance, globalStats.totalDistance)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Observaties</span>
              <span className="text-gray-800 font-medium">{calculatePercentage(userStats.totalObservations, globalStats.totalObservations)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-yellow-600 h-2.5 rounded-full" 
                style={{ width: `${calculatePercentage(userStats.totalObservations, globalStats.totalObservations)}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Synchronisatie */}
        <div className="mb-4">
          <button
            onClick={handleSync}
            disabled={syncing || !hasPendingItems}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              hasPendingItems
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
          >
            <FaSync className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Bezig met synchroniseren...' : (
              hasPendingItems 
                ? `Synchroniseer offline gegevens (${pendingCount})` 
                : 'Geen offline gegevens om te synchroniseren'
            )}
          </button>
          
          {syncMessage && (
            <div className={`text-sm p-2 rounded ${
              syncSuccess === null
                ? 'bg-blue-50 text-blue-700'
                : syncSuccess
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center">
                {syncSuccess === null ? (
                  <FaInfoCircle className="mr-1" />
                ) : syncSuccess ? (
                  <FaCheck className="mr-1" />
                ) : (
                  <FaExclamationTriangle className="mr-1" />
                )}
                {syncMessage}
              </div>
            </div>
          )}
        </div>
        
        {/* Observatie tags instellingen */}
        <div className="mb-4">
          <button
            onClick={() => setShowTagsSettings(!showTagsSettings)}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors duration-200"
          >
            <FaTags className="mr-2" />
            Observatie tags beheren
          </button>
          
          {showTagsSettings && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Pas de tags aan die je kunt gebruiken bij het toevoegen van observaties.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {observationTags.map(tag => (
                  <div key={tag} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm flex items-center">
                    <span>{tag}</span>
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Nieuwe tag"
                  className="flex-grow border-gray-300 rounded-l-lg text-sm"
                />
                <button
                  onClick={handleAddTag}
                  className="bg-indigo-600 text-white px-3 py-1 rounded-r-lg text-sm"
                >
                  Toevoegen
                </button>
              </div>
              
              <button
                onClick={handleSaveTagsSettings}
                className="mt-3 w-full bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 transition-colors duration-200 text-sm"
              >
                Opslaan
              </button>
            </div>
          )}
        </div>
        
        {/* Vogelwaarnemingen instellingen */}
        <div className="mb-4">
          <button
            onClick={() => setShowBirdSettings(!showBirdSettings)}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors duration-200"
          >
            <FaBinoculars className="mr-2" />
            Vogelwaarnemingen instellingen
          </button>
          
          {showBirdSettings && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zoekradius voor vogelwaarnemingen (km)
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={birdRadius}
                onChange={handleBirdRadiusChange}
                className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 km</span>
                <span>{birdRadius} km</span>
                <span>50 km</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 mb-3">
                Je zoekt momenteel naar vogelwaarnemingen binnen <span className="font-semibold">{birdRadius} km</span> van je locatie.
              </p>
              <button
                onClick={handleSaveBirdSettings}
                className="mt-3 w-full bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm"
              >
                Opslaan
              </button>
            </div>
          )}
        </div>
        
        {/* Verwijder wandelingen */}
        <div className="mb-4">
          <button
            onClick={() => setShowWalksDeleteConfirm(true)}
            className="w-full flex items-center justify-center px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors duration-200"
          >
            <FaTrash className="mr-2" />
            Verwijder alle wandelingen
          </button>
          
          {showWalksDeleteConfirm && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 mb-3">
                Weet je zeker dat je alle wandelingen en observaties wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowWalksDeleteConfirm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-1 px-3 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm"
                  disabled={deleting}
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDeleteWalks}
                  className="flex-1 bg-red-600 text-white py-1 px-3 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm flex items-center justify-center"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Bezig...
                    </>
                  ) : (
                    'Verwijderen'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Instellingen */}
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg mb-4 transition-colors duration-200"
        >
          <FaCog className="mr-2" />
          Instellingen
        </button>
        
        {/* Uitloggen */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg mb-4 transition-colors duration-200"
        >
          <FaSignOutAlt className="mr-2" />
          Uitloggen
        </button>
        
        {/* Verwijder account */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors duration-200"
        >
          <FaTrash className="mr-2" />
          Verwijder account
        </button>
        
        {showDeleteConfirm && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 mb-3">
              Weet je zeker dat je je account wilt verwijderen? Al je gegevens worden permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-1 px-3 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm"
                disabled={deleting}
              >
                Annuleren
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 text-white py-1 px-3 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm flex items-center justify-center"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Bezig...
                  </>
                ) : (
                  'Verwijderen'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Instructies voor toevoegen aan beginscherm */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Voeg Wandeldagboek toe aan je beginscherm
        </h3>
        
        <p className="text-gray-600 text-sm mb-4">
          Voor de beste ervaring kun je Wandeldagboek toevoegen aan je beginscherm. 
          Zo heb je snel toegang tot de app en kun je deze offline gebruiken.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="mb-4">
            <p className="font-medium text-gray-700 mb-1">iPhone / iPad:</p>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 pl-1">
              <li>Open deze website in Safari</li>
              <li>Tik op het 'Deel' icoon (vierkant met pijl omhoog)</li>
              <li>Scroll naar beneden en tik op 'Zet op beginscherm'</li>
              <li>Tik op 'Voeg toe'</li>
            </ol>
          </div>
          
          <div>
            <p className="font-medium text-gray-700 mb-1">Android:</p>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 pl-1">
              <li>Open deze website in Chrome</li>
              <li>Tik op de drie puntjes (menu) rechtsboven</li>
              <li>Tik op 'Toevoegen aan startscherm'</li>
              <li>Tik op 'Toevoegen'</li>
            </ol>
          </div>
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-500 mb-6">
        <p>Wandeldagboek v3.0</p>
        <p>&copy; {new Date().getFullYear()} - Een PWA voor natuurobservaties</p>
      </div>
    </div>
  );
};

// Helper functie voor het formatteren van afstanden
const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export default ProfilePage; 
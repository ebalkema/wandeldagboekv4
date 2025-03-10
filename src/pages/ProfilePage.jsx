import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserWalks, getGlobalStats } from '../services/firestoreService';
import { hasPendingSyncItems, syncOfflineItems, getPendingSyncCount } from '../services/offlineService';
import { FaSignOutAlt, FaSync, FaCog, FaInfoCircle, FaHeart, FaBinoculars } from 'react-icons/fa';
import { FaCheck, FaExclamationTriangle, FaUsers, FaRoute, FaEye, FaMedal } from 'react-icons/fa';
import { FaFire } from 'react-icons/fa';

/**
 * Profielpagina voor gebruikersinstellingen en statistieken
 */
const ProfilePage = () => {
  const { currentUser, logout, userSettings, updateUserSettings } = useAuth();
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
        
        // Tel observaties
        const totalObservations = walks.reduce((sum, walk) => {
          const observationCount = walk.observationCount || 0;
          return sum + observationCount;
        }, 0);
        
        console.log('Gebruikersstatistieken berekend:', {
          totalWalks,
          totalDistance,
          totalObservations
        });
        
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
    
    // Controleer of er offline items zijn om te synchroniseren
    setHasPendingItems(hasPendingSyncItems());
    setPendingCount(getPendingSyncCount());
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

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profiel</h1>
      
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
            <p className="text-2xl font-bold text-green-600">
              {(userStats.totalDistance / 1000).toFixed(1)}
            </p>
            <p className="text-sm text-gray-600">Kilometer</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-yellow-600">{userStats.totalObservations}</p>
            <p className="text-sm text-gray-600">Observaties</p>
          </div>
        </div>
        
        {/* Vergelijking met andere gebruikers */}
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Jouw bijdrage</h3>
        <div className="space-y-4 mb-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Wandelingen</span>
              <span className="text-sm font-medium text-gray-700">
                {calculatePercentage(userStats.totalWalks, globalStats.totalWalks)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${calculatePercentage(userStats.totalWalks, globalStats.totalWalks)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Afstand</span>
              <span className="text-sm font-medium text-gray-700">
                {calculatePercentage(userStats.totalDistance, globalStats.totalDistance)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{ width: `${calculatePercentage(userStats.totalDistance, globalStats.totalDistance)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Observaties</span>
              <span className="text-sm font-medium text-gray-700">
                {calculatePercentage(userStats.totalObservations, globalStats.totalObservations)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-yellow-600 h-2.5 rounded-full" 
                style={{ width: `${calculatePercentage(userStats.totalObservations, globalStats.totalObservations)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Globale statistieken */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Wandeldagboek Community
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <FaUsers className="text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{globalStats.totalUsers}</p>
              <p className="text-sm text-gray-600">Gebruikers</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <FaRoute className="text-green-600 text-xl" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{globalStats.totalWalks}</p>
              <p className="text-sm text-gray-600">Wandelingen</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
            <div className="bg-yellow-100 p-2 rounded-full mr-3">
              <FaEye className="text-yellow-600 text-xl" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{globalStats.totalObservations}</p>
              <p className="text-sm text-gray-600">Observaties</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-purple-50 rounded-lg">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <FaMedal className="text-purple-600 text-xl" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                {globalStats.totalDistance ? (globalStats.totalDistance / 1000).toFixed(1) : '0'}
              </p>
              <p className="text-sm text-gray-600">Kilometer</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          Samen maken we een verschil voor natuurobservatie!
        </p>
      </div>
      
      {/* Vogelwaarnemingen instellingen */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <FaBinoculars className="text-primary-500 mr-2" />
            Vogelwaarnemingen
          </h3>
          <button
            onClick={() => setShowBirdSettings(!showBirdSettings)}
            className="text-primary-600 hover:text-primary-800"
          >
            <FaCog />
          </button>
        </div>
        
        {showBirdSettings ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="mb-4">
              <label htmlFor="birdRadius" className="block text-sm font-medium text-gray-700 mb-1">
                Zoekradius (km)
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  id="birdRadius"
                  min="1"
                  max="50"
                  step="1"
                  value={birdRadius}
                  onChange={handleBirdRadiusChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="ml-2 text-gray-700 min-w-[2.5rem] text-center">{birdRadius}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Stel in hoe ver (in kilometers) je wilt zoeken naar vogelwaarnemingen.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowBirdSettings(false)}
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors mr-2"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveBirdSettings}
                className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Opslaan
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">
              Je zoekt momenteel naar vogelwaarnemingen binnen <span className="font-semibold">{userSettings?.birdRadius || 10} km</span> van je locatie.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Klik op het tandwiel-icoon om deze instelling aan te passen.
            </p>
          </div>
        )}
      </div>
      
      {/* Acties */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Acties</h3>
        
        {/* Synchronisatie */}
        <div className="mb-4">
          <button
            onClick={handleSync}
            disabled={syncing || !hasPendingItems}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg mb-2 ${
              hasPendingItems
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-500'
            } transition-colors duration-200`}
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
              <button
                onClick={handleSaveBirdSettings}
                className="mt-3 w-full bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm"
              >
                Opslaan
              </button>
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
          className="w-full flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors duration-200"
        >
          <FaSignOutAlt className="mr-2" />
          Uitloggen
        </button>
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

export default ProfilePage; 
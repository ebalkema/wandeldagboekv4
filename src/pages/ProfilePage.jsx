import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserWalks } from '../services/firestoreService';
import { hasPendingSyncItems, syncOfflineItems, getPendingSyncCount } from '../services/offlineService';
import { FaSignOutAlt, FaSync, FaCog, FaInfoCircle, FaHeart, FaFireAlt, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Profielpagina voor gebruikersinstellingen en statistieken
 */
const ProfilePage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [userStats, setUserStats] = useState({
    totalWalks: 0,
    totalDistance: 0,
    totalObservations: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Haal gebruikersstatistieken op
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!currentUser) return;
      
      try {
        const walks = await getUserWalks(currentUser.uid);
        
        // Bereken statistieken
        const totalWalks = walks.length;
        const totalDistance = walks.reduce((sum, walk) => sum + (walk.distance || 0), 0);
        const totalObservations = walks.reduce((sum, walk) => sum + (walk.observationCount || 0), 0);
        
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
        
        {/* Statistieken */}
        <div className="grid grid-cols-3 gap-4 mb-4">
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
      </div>
      
      {/* Acties */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="divide-y divide-gray-100">
          {/* Synchronisatie */}
          {hasPendingItems && (
            <div className="px-4 py-3">
              <button 
                onClick={handleSync}
                disabled={syncing}
                className={`w-full flex items-center text-left ${
                  syncSuccess === false ? 'text-yellow-700' : 
                  syncSuccess === true ? 'text-green-700' : 
                  'text-blue-700'
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 mr-3">
                  {syncing ? (
                    <FaSync className="text-blue-600 animate-spin" />
                  ) : syncSuccess === true ? (
                    <FaCheck className="text-green-600" />
                  ) : syncSuccess === false ? (
                    <FaExclamationTriangle className="text-yellow-600" />
                  ) : (
                    <FaSync className="text-blue-600" />
                  )}
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center">
                    <p className="font-medium">Synchroniseer met Firestore</p>
                    <FaFireAlt className="text-orange-500 ml-2" />
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {pendingCount} item{pendingCount !== 1 ? 's' : ''} wachten op synchronisatie
                  </p>
                  
                  {syncMessage && (
                    <p className={`text-sm mt-1 ${
                      syncSuccess === false ? 'text-yellow-700' : 
                      syncSuccess === true ? 'text-green-700' : 
                      'text-gray-600'
                    }`}>
                      {syncMessage}
                    </p>
                  )}
                </div>
              </button>
            </div>
          )}
          
          {/* Instellingen */}
          <button 
            onClick={() => navigate('/settings')}
            className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
          >
            <FaCog className="text-gray-600 mr-3" />
            <p className="font-medium">Instellingen</p>
          </button>
          
          {/* Over */}
          <button 
            onClick={() => {}}
            className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
          >
            <FaInfoCircle className="text-gray-600 mr-3" />
            <p className="font-medium">Over Wandeldagboek</p>
          </button>
          
          {/* Doneren */}
          <button 
            onClick={() => {}}
            className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
          >
            <FaHeart className="text-red-500 mr-3" />
            <p className="font-medium">Steun dit project</p>
          </button>
          
          {/* Uitloggen */}
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
          >
            <FaSignOutAlt className="text-red-600 mr-3" />
            <p className="font-medium">Uitloggen</p>
          </button>
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
import React, { useState, useEffect } from 'react';
import { isOnline, hasPendingSyncItems, getPendingSyncCount, syncOfflineItems } from '../services/offlineService';
import { FaWifi, FaSync, FaCheck, FaExclamationTriangle, FaBan } from 'react-icons/fa';
import { FaFire } from 'react-icons/fa';

/**
 * Component voor het weergeven van de offline status en synchronisatie-opties
 */
const OfflineIndicator = () => {
  const [online, setOnline] = useState(isOnline());
  const [pendingItems, setPendingItems] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Controleer online status en pending items
  useEffect(() => {
    const checkStatus = () => {
      setOnline(isOnline());
      setPendingItems(getPendingSyncCount());
    };

    // Initiële check
    checkStatus();

    // Registreer event listeners
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);

    // Check elke 30 seconden
    const interval = setInterval(checkStatus, 30000);

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      clearInterval(interval);
    };
  }, []);

  // Synchroniseer offline items
  const handleSync = async () => {
    if (!online || syncing) return;

    setSyncing(true);
    setSyncMessage('Bezig met synchroniseren naar Firestore...');
    setSyncSuccess(null);
    setShowDetails(true);

    try {
      const result = await syncOfflineItems();
      setSyncMessage(result.message);
      setPendingItems(getPendingSyncCount());
      setSyncSuccess(result.success);

      // Verberg het bericht na 5 seconden
      setTimeout(() => {
        setSyncMessage('');
        setShowDetails(false);
      }, 5000);
    } catch (error) {
      setSyncMessage('Fout bij synchroniseren naar Firestore');
      setSyncSuccess(false);
      console.error('Synchronisatiefout:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Als er geen offline items zijn en we zijn online, toon niets
  if (online && pendingItems === 0 && !syncMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className={`flex flex-col p-3 rounded-lg shadow-lg ${
          !online ? 'bg-red-50' : 
          syncSuccess === false ? 'bg-yellow-50' : 
          syncSuccess === true ? 'bg-green-50' : 
          'bg-blue-50'
        }`}
        style={{ maxWidth: '300px' }}
      >
        <div className="flex items-center">
          {!online ? (
            <div className="relative mr-2">
              <FaWifi className="text-red-300" />
              <FaBan className="text-red-500 absolute top-0 left-0 text-sm" />
            </div>
          ) : syncing ? (
            <FaSync className="text-blue-500 mr-2 animate-spin" />
          ) : syncSuccess === true ? (
            <FaCheck className="text-green-500 mr-2" />
          ) : syncSuccess === false ? (
            <FaExclamationTriangle className="text-yellow-500 mr-2" />
          ) : (
            <FaWifi className="text-green-500 mr-2" />
          )}
          
          <div className="text-sm flex-grow">
            {!online && <span className="font-medium text-red-700">Offline</span>}
            
            {online && pendingItems > 0 && (
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-blue-700">
                  {pendingItems} item{pendingItems !== 1 ? 's' : ''} wachten op synchronisatie
                </span>
                
                <div className="flex items-center ml-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className={`flex items-center justify-center p-1 rounded-full ${
                      syncing ? 'bg-gray-200' : 'bg-blue-100 hover:bg-blue-200'
                    }`}
                    aria-label="Synchroniseren"
                    title="Synchroniseer met Firestore"
                  >
                    <FaSync className={`text-blue-700 ${syncing ? 'animate-spin' : ''}`} />
                  </button>
                  
                  <FaFire className="text-orange-500 ml-1" title="Firestore" />
                </div>
              </div>
            )}
            
            {syncMessage && (
              <div className={`text-sm mt-1 ${
                syncSuccess === false ? 'text-yellow-700' : 
                syncSuccess === true ? 'text-green-700' : 
                'text-gray-600'
              }`}>
                {syncMessage}
              </div>
            )}
          </div>
        </div>
        
        {showDetails && pendingItems > 0 && (
          <div className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
            <p className="flex items-center">
              <FaFire className="text-orange-500 mr-1" />
              <span>Synchroniseren naar Firestore database</span>
            </p>
            <p className="mt-1">
              Je gegevens worden bewaard totdat ze succesvol zijn gesynchroniseerd.
            </p>
          </div>
        )}
        
        {!online && (
          <div className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
            <p>Je wijzigingen worden lokaal opgeslagen en gesynchroniseerd wanneer je weer online bent.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator; 
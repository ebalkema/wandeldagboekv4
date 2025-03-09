import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUser, updateUserSettings } from '../services/firestoreService';

/**
 * Pagina voor gebruikersinstellingen
 */
const SettingsPage = () => {
  const { currentUser } = useAuth();
  
  const [settings, setSettings] = useState({
    voiceCommandsEnabled: true,
    automaticWeatherEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Haal gebruikersinstellingen op
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const userData = await getUser(currentUser.uid);
        
        if (userData && userData.settings) {
          setSettings(userData.settings);
        }
      } catch (error) {
        console.error('Fout bij het ophalen van gebruikersinstellingen:', error);
        setError('Kon instellingen niet laden. Probeer het later opnieuw.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserSettings();
  }, [currentUser]);

  // Update een instelling
  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Sla instellingen op
  const handleSaveSettings = async () => {
    if (!currentUser) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await updateUserSettings(currentUser.uid, settings);
      
      setSuccess('Instellingen succesvol opgeslagen');
    } catch (error) {
      console.error('Fout bij het opslaan van instellingen:', error);
      setError('Kon instellingen niet opslaan. Probeer het later opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Instellingen</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Algemene instellingen</h2>
        
        {loading ? (
          <div className="flex justify-center py-4">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Spraakcommando's</h3>
                <p className="text-sm text-gray-600">
                  Schakel spraakcommando's in of uit
                </p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.voiceCommandsEnabled}
                  onChange={(e) => handleSettingChange('voiceCommandsEnabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Automatische weergegevens</h3>
                <p className="text-sm text-gray-600">
                  Haal automatisch weergegevens op tijdens wandelingen
                </p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.automaticWeatherEnabled}
                  onChange={(e) => handleSettingChange('automaticWeatherEnabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
              >
                {saving ? 'Bezig met opslaan...' : 'Instellingen opslaan'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Accountgegevens</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-800">E-mailadres</h3>
            <p className="text-gray-600">{currentUser?.email}</p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-800">Naam</h3>
            <p className="text-gray-600">{currentUser?.displayName || 'Niet ingesteld'}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">App-informatie</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-800">Versie</h3>
            <p className="text-gray-600">1.0.0</p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-800">Over</h3>
            <p className="text-gray-600">
              Wandeldagboek is een PWA voor het vastleggen van wandelingen en natuurobservaties.
              Ontwikkeld met React, Firebase en OpenStreetMap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 
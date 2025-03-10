import { useState, useEffect } from 'react';
import { FaBinoculars, FaMapMarkerAlt, FaCalendarAlt, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import { getNearbyObservations, getNearbyHotspots, getBirdImageUrl } from '../services/ebirdService';
import { useAuth } from '../context/AuthContext';

/**
 * Component voor het weergeven van vogelwaarnemingen in de buurt
 */
const BirdObservations = ({ location, radius }) => {
  const { userSettings } = useAuth();
  const [observations, setObservations] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('observations'); // 'observations' of 'hotspots'
  const [birdImages, setBirdImages] = useState({});
  
  // Gebruik de radius uit de gebruikersinstellingen als er geen radius is opgegeven
  const searchRadius = radius || userSettings.birdRadius || 10;
  
  useEffect(() => {
    const fetchData = async () => {
      if (!location || !location.lat || !location.lng) {
        setError('Geen locatie beschikbaar');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Haal vogelwaarnemingen op
        const birdObservations = await getNearbyObservations(location.lat, location.lng, searchRadius);
        setObservations(birdObservations);
        
        // Haal hotspots op
        const nearbyHotspots = await getNearbyHotspots(location.lat, location.lng, searchRadius);
        setHotspots(nearbyHotspots);
        
        // Haal afbeeldingen op voor elke vogelsoort
        const imagePromises = birdObservations.map(async (obs) => {
          const imageUrl = await getBirdImageUrl(obs.scientificName);
          return { speciesCode: obs.speciesCode, imageUrl };
        });
        
        const imageResults = await Promise.all(imagePromises);
        const imageMap = {};
        
        imageResults.forEach(result => {
          if (result.imageUrl) {
            imageMap[result.speciesCode] = result.imageUrl;
          }
        });
        
        setBirdImages(imageMap);
      } catch (error) {
        console.error('Fout bij het ophalen van vogelgegevens:', error);
        setError('Kon vogelgegevens niet laden');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [location, searchRadius, userSettings.birdRadius]);
  
  // Groepeer waarnemingen per locatie
  const groupedObservations = observations.reduce((groups, obs) => {
    const locationName = obs.location.name;
    if (!groups[locationName]) {
      groups[locationName] = [];
    }
    groups[locationName].push(obs);
    return groups;
  }, {});
  
  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-2 text-gray-600">Vogelwaarnemingen laden...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex items-center text-yellow-700 mb-2">
          <FaExclamationCircle className="mr-2" />
          <p>{error}</p>
        </div>
        <p className="text-gray-600 text-sm">
          Controleer je internetverbinding en probeer het later opnieuw.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'observations'
              ? 'text-primary-600 border-b-2 border-primary-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('observations')}
        >
          <div className="flex items-center justify-center">
            <FaBinoculars className="mr-2" />
            <span>Waarnemingen</span>
          </div>
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'hotspots'
              ? 'text-primary-600 border-b-2 border-primary-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('hotspots')}
        >
          <div className="flex items-center justify-center">
            <FaMapMarkerAlt className="mr-2" />
            <span>Hotspots</span>
          </div>
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {activeTab === 'observations' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Recente vogelwaarnemingen
              </h3>
              <span className="text-sm text-gray-500">
                {observations.length} soorten gevonden binnen {searchRadius} km
              </span>
            </div>
            
            {observations.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>Geen recente vogelwaarnemingen gevonden in deze omgeving.</p>
                <p className="text-sm mt-2">
                  Probeer een grotere zoekradius of bezoek een van de hotspots in de buurt.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedObservations).map(([locationName, locationObservations]) => (
                  <div key={locationName} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="text-primary-500 mr-2" />
                        <h4 className="font-medium text-gray-800">{locationName}</h4>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {locationObservations.map((obs) => (
                        <div key={`${obs.speciesCode}-${obs.observationDate}`} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start">
                              {birdImages[obs.speciesCode] && (
                                <div className="mr-3 flex-shrink-0">
                                  <img 
                                    src={birdImages[obs.speciesCode]} 
                                    alt={obs.commonName} 
                                    className="w-16 h-16 object-cover rounded-lg"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-800">
                                  {obs.dutchName ? (
                                    <>
                                      {obs.dutchName} <span className="text-gray-500 text-sm">({obs.commonName})</span>
                                    </>
                                  ) : (
                                    obs.commonName
                                  )}
                                </p>
                                <p className="text-sm text-gray-500 italic">{obs.scientificName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                                {obs.howMany} {obs.howMany === 1 ? 'exemplaar' : 'exemplaren'}
                              </span>
                              {obs.isRare && (
                                <div className="mt-1 text-yellow-600 text-xs flex items-center justify-end">
                                  <FaExclamationCircle className="mr-1" />
                                  <span>Zeldzaam</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 flex items-center">
                            <FaCalendarAlt className="mr-1" />
                            <span>{new Date(obs.observationDate).toLocaleDateString('nl-NL')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {activeTab === 'hotspots' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Vogel-hotspots in de buurt
              </h3>
              <span className="text-sm text-gray-500">
                {hotspots.length} locaties gevonden binnen {searchRadius} km
              </span>
            </div>
            
            {hotspots.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>Geen vogel-hotspots gevonden in deze omgeving.</p>
                <p className="text-sm mt-2">
                  Probeer een grotere zoekradius of een andere locatie.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {hotspots.map((hotspot) => (
                  <div key={hotspot.locId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{hotspot.name}</p>
                          <p className="text-sm text-gray-500">
                            {hotspot.numSpeciesAllTime} soorten waargenomen
                          </p>
                        </div>
                        <a
                          href={`https://ebird.org/hotspot/${hotspot.locId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                        >
                          <span>Details</span>
                          <FaInfoCircle className="ml-1" />
                        </a>
                      </div>
                      {hotspot.latestObsDate && (
                        <div className="mt-1 text-xs text-gray-500 flex items-center">
                          <FaCalendarAlt className="mr-1" />
                          <span>Laatste waarneming: {new Date(hotspot.latestObsDate).toLocaleDateString('nl-NL')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 border-t border-gray-200">
        <p>
          Gegevens van <a href="https://ebird.org" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">eBird</a>, 
          een project van het Cornell Lab of Ornithology
        </p>
      </div>
    </div>
  );
};

export default BirdObservations; 
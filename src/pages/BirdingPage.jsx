import { useState, useEffect } from 'react';
import { FaBinoculars, FaMapMarkerAlt, FaSearch, FaFilter, FaInfoCircle, FaMap } from 'react-icons/fa';
import { getNearbyObservations, getNearbyHotspots, getSpeciesInfo } from '../services/ebirdService';
import { checkLocationAvailability, getCurrentPosition } from '../services/locationService';
import LazyMapComponent from '../components/LazyMapComponent';
import { useAuth } from '../hooks/useAuth';

/**
 * Pagina voor vogelwaarnemingen
 */
const BirdingPage = () => {
  const { userSettings } = useAuth();
  const [location, setLocation] = useState(null);
  const [observations, setObservations] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('observations'); // 'observations', 'hotspots', of 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(userSettings?.birdRadius || 10);
  const [days, setDays] = useState(7);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [speciesInfo, setSpeciesInfo] = useState(null);
  const [speciesInfoLoading, setSpeciesInfoLoading] = useState(false);
  const [selectedBirdLocation, setSelectedBirdLocation] = useState(null);
  const [showBirdsOnMap, setShowBirdsOnMap] = useState(false);
  
  // Haal de huidige locatie op
  useEffect(() => {
    const getLocation = async () => {
      try {
        const isAvailable = await checkLocationAvailability();
        
        if (!isAvailable) {
          setError('Locatieservices zijn niet beschikbaar');
          setLoading(false);
          return;
        }
        
        const position = await getCurrentPosition();
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        console.error('Fout bij het ophalen van locatie:', error);
        setError('Kon locatie niet ophalen');
        setLoading(false);
      }
    };
    
    getLocation();
  }, []);
  
  // Update radius wanneer userSettings veranderen
  useEffect(() => {
    if (userSettings?.birdRadius) {
      setRadius(userSettings.birdRadius);
    }
  }, [userSettings]);
  
  // Haal vogelwaarnemingen en hotspots op wanneer de locatie verandert
  useEffect(() => {
    const fetchData = async () => {
      if (!location) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Haal vogelwaarnemingen op
        const birdObservations = await getNearbyObservations(location.lat, location.lng, radius, days);
        setObservations(birdObservations);
        
        // Haal hotspots op
        const nearbyHotspots = await getNearbyHotspots(location.lat, location.lng, radius);
        setHotspots(nearbyHotspots);
      } catch (error) {
        console.error('Fout bij het ophalen van vogelgegevens:', error);
        setError('Kon vogelgegevens niet laden');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [location, radius, days]);
  
  // Haal informatie op over een specifieke vogelsoort
  const fetchSpeciesInfo = async (speciesCode) => {
    if (!speciesCode) return;
    
    try {
      setSpeciesInfoLoading(true);
      const info = await getSpeciesInfo(speciesCode);
      setSpeciesInfo(info);
    } catch (error) {
      console.error('Fout bij het ophalen van soortinformatie:', error);
    } finally {
      setSpeciesInfoLoading(false);
    }
  };
  
  // Functie om een vogellocatie te selecteren op de kaart
  const handleBirdLocationSelect = (location, showAll = false) => {
    setSelectedBirdLocation(location);
    setShowBirdsOnMap(true);
    setActiveTab('map'); // Schakel naar de kaart tab
  };
  
  // Functie om terug te gaan naar de normale kaartweergave
  const handleResetMapView = () => {
    setSelectedBirdLocation(null);
    setShowBirdsOnMap(false);
  };
  
  // Functie om alle vogels op de kaart te tonen
  const handleShowAllBirdsOnMap = () => {
    const birdLocations = observations.map(obs => ({
      lat: obs.location.lat,
      lng: obs.location.lng,
      name: obs.dutchName || obs.commonName,
      scientificName: obs.scientificName,
      dutchName: obs.dutchName,
      commonName: obs.commonName,
      howMany: obs.howMany,
      observationDate: obs.observationDate,
      type: 'bird'
    }));
    
    setSelectedBirdLocation(birdLocations);
    setShowBirdsOnMap(true);
    setActiveTab('map'); // Schakel naar de kaart tab
  };
  
  // Groepeer waarnemingen per locatie
  const groupedObservations = observations.reduce((groups, obs) => {
    const locationName = obs.location.name;
    if (!groups[locationName]) {
      groups[locationName] = [];
    }
    groups[locationName].push(obs);
    return groups;
  }, {});
  
  // Filter waarnemingen op basis van zoekopdracht
  const filteredObservations = observations.filter(obs => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      obs.commonName.toLowerCase().includes(query) ||
      obs.scientificName.toLowerCase().includes(query) ||
      obs.location.name.toLowerCase().includes(query)
    );
  });
  
  // Filter hotspots op basis van zoekopdracht
  const filteredHotspots = hotspots.filter(spot => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return spot.name.toLowerCase().includes(query);
  });
  
  // Groepeer gefilterde waarnemingen per locatie
  const filteredGroupedObservations = filteredObservations.reduce((groups, obs) => {
    const locationName = obs.location.name;
    if (!groups[locationName]) {
      groups[locationName] = [];
    }
    groups[locationName].push(obs);
    return groups;
  }, {});
  
  // Toon soortinformatie
  const handleSpeciesClick = (species) => {
    setSelectedSpecies(species);
    fetchSpeciesInfo(species.speciesCode);
  };
  
  // Sluit soortinformatie
  const handleCloseSpeciesInfo = () => {
    setSelectedSpecies(null);
    setSpeciesInfo(null);
  };
  
  if (loading && !location) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-2 text-gray-600">Locatie bepalen...</p>
        </div>
      </div>
    );
  }
  
  if (error && !location) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex items-center text-yellow-700 mb-2">
          <FaInfoCircle className="mr-2" />
          <p>{error}</p>
        </div>
        <p className="text-gray-600 text-sm">
          Deze functie heeft toegang tot je locatie nodig. Controleer je browserinstellingen en probeer het opnieuw.
        </p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <FaBinoculars className="text-primary-600 mr-2" />
        Vogelwaarnemingen
      </h1>
      
      {/* Zoek- en filterbalk */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Zoek op naam of locatie..."
              className="pl-10 w-full border-gray-300 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex items-center">
              <label htmlFor="radius" className="text-sm text-gray-600 mr-2">Straal:</label>
              <select
                id="radius"
                className="border-gray-300 rounded-lg text-sm"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <label htmlFor="days" className="text-sm text-gray-600 mr-2">Dagen:</label>
              <select
                id="days"
                className="border-gray-300 rounded-lg text-sm"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value="1">1 dag</option>
                <option value="7">7 dagen</option>
                <option value="14">14 dagen</option>
                <option value="30">30 dagen</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
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
          <button
            className={`flex-1 py-3 px-4 text-center ${
              activeTab === 'map'
                ? 'text-primary-600 border-b-2 border-primary-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('map')}
          >
            <div className="flex items-center justify-center">
              <FaMap className="mr-2" />
              <span>Kaart</span>
            </div>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="ml-2 text-gray-600">Gegevens laden...</p>
            </div>
          )}
          
          {!loading && activeTab === 'observations' && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Recente vogelwaarnemingen
                </h3>
                <div className="flex items-center">
                  {observations.length > 0 && (
                    <button 
                      onClick={handleShowAllBirdsOnMap}
                      className="mr-2 text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full flex items-center"
                    >
                      <FaMap className="mr-1" />
                      <span>Toon op kaart</span>
                    </button>
                  )}
                  <span className="text-sm text-gray-500">
                    {filteredObservations.length} soorten gevonden
                  </span>
                </div>
              </div>
              
              {filteredObservations.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>Geen vogelwaarnemingen gevonden die voldoen aan je zoekcriteria.</p>
                  <p className="text-sm mt-2">
                    Probeer een andere zoekopdracht, een grotere zoekradius of een langere periode.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(filteredGroupedObservations).map(([locationName, locationObservations]) => (
                    <div key={locationName} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="text-primary-500 mr-2" />
                          <h4 className="font-medium text-gray-800">{locationName}</h4>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {locationObservations.map((obs) => (
                          <div 
                            key={`${obs.speciesCode}-${obs.observationDate}`} 
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleSpeciesClick(obs)}
                          >
                            <div className="flex justify-between items-start">
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
                              <div className="text-right">
                                <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                                  {obs.howMany} {obs.howMany === 1 ? 'exemplaar' : 'exemplaren'}
                                </span>
                                {obs.isRare && (
                                  <div className="mt-1 text-yellow-600 text-xs flex items-center justify-end">
                                    <FaInfoCircle className="mr-1" />
                                    <span>Zeldzaam</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
                              <span>{new Date(obs.observationDate).toLocaleDateString('nl-NL')}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBirdLocationSelect(obs);
                                }}
                                className="text-primary-600 flex items-center"
                              >
                                <FaMap className="mr-1" />
                                <span>Toon op kaart</span>
                              </button>
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
          
          {!loading && activeTab === 'hotspots' && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Vogel-hotspots in de buurt
                </h3>
                <span className="text-sm text-gray-500">
                  {filteredHotspots.length} locaties gevonden
                </span>
              </div>
              
              {filteredHotspots.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>Geen vogel-hotspots gevonden die voldoen aan je zoekcriteria.</p>
                  <p className="text-sm mt-2">
                    Probeer een andere zoekopdracht of een grotere zoekradius.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHotspots.map((hotspot) => (
                    <div key={hotspot.locId} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">{hotspot.name}</p>
                            <p className="text-sm text-gray-500">
                              {hotspot.numSpeciesAllTime} soorten waargenomen
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleBirdLocationSelect({
                                lat: hotspot.latitude,
                                lng: hotspot.longitude,
                                name: hotspot.name,
                                type: 'hotspot',
                                numSpeciesAllTime: hotspot.numSpeciesAllTime
                              })}
                              className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                            >
                              <FaMap className="mr-1" />
                              <span>Toon op kaart</span>
                            </button>
                            <a
                              href={`https://ebird.org/hotspot/${hotspot.locId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>Details</span>
                              <FaInfoCircle className="ml-1" />
                            </a>
                          </div>
                        </div>
                        {hotspot.latestObsDate && (
                          <div className="mt-1 text-xs text-gray-500 flex items-center">
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
          
          {!loading && activeTab === 'map' && (
            <>
              <div className="mb-4">
                {showBirdsOnMap && (
                  <div className="bg-primary-50 p-2 flex justify-between items-center mb-2 rounded-lg">
                    <div className="flex items-center">
                      <FaBinoculars className="text-primary-600 mr-2" />
                      <span className="text-sm font-medium">
                        {selectedBirdLocation && !Array.isArray(selectedBirdLocation) 
                          ? `${selectedBirdLocation.dutchName || selectedBirdLocation.name} op kaart` 
                          : `Vogelwaarnemingen binnen ${radius} km`}
                      </span>
                    </div>
                    <button 
                      onClick={handleResetMapView}
                      className="text-xs bg-white text-primary-600 border border-primary-300 px-2 py-1 rounded hover:bg-primary-50"
                    >
                      Terug naar overzicht
                    </button>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Kaart van waarnemingen en hotspots
                </h3>
                <div className="h-96 bg-gray-100 rounded-lg overflow-hidden">
                  {location && (
                    <LazyMapComponent
                      center={[location.lat, location.lng]}
                      birdLocations={selectedBirdLocation}
                      zoom={10}
                      height="100%"
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                  <span className="text-gray-700">Waarnemingen ({filteredObservations.length})</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                  <span className="text-gray-700">Hotspots ({filteredHotspots.length})</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Soortinformatie modal */}
      {selectedSpecies && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Soortinformatie</h3>
              <button 
                onClick={handleCloseSpeciesInfo}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {speciesInfoLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="ml-2 text-gray-600">Informatie laden...</p>
                </div>
              ) : (
                <>
                  <h4 className="text-xl font-bold text-gray-800 mb-1">
                    {selectedSpecies.dutchName || selectedSpecies.commonName}
                  </h4>
                  {selectedSpecies.dutchName && (
                    <p className="text-gray-600 mb-1">{selectedSpecies.commonName}</p>
                  )}
                  <p className="text-gray-600 italic mb-4">{selectedSpecies.scientificName}</p>
                  
                  {speciesInfo && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-500">Familie</h5>
                        <p className="text-gray-800">{speciesInfo.familyCommonName}</p>
                        <p className="text-gray-600 italic text-sm">{speciesInfo.familyScientificName}</p>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-gray-500">Orde</h5>
                        <p className="text-gray-800">{speciesInfo.order}</p>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-gray-500">Categorie</h5>
                        <p className="text-gray-800">{speciesInfo.category}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <h5 className="text-sm font-medium text-gray-500 mb-2">Waarneming details</h5>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Locatie:</span> {selectedSpecies.location.name}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Datum:</span> {new Date(selectedSpecies.observationDate).toLocaleDateString('nl-NL')}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Aantal:</span> {selectedSpecies.howMany} {selectedSpecies.howMany === 1 ? 'exemplaar' : 'exemplaren'}
                      </p>
                      {selectedSpecies.isRare && (
                        <p className="text-sm text-yellow-600 font-medium mt-2">
                          Dit is een zeldzame waarneming!
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() => {
                        handleBirdLocationSelect(selectedSpecies);
                        handleCloseSpeciesInfo();
                      }}
                      className="bg-primary-100 text-primary-700 py-2 px-4 rounded-lg hover:bg-primary-200 transition-colors flex items-center"
                    >
                      <FaMap className="mr-2" />
                      <span>Toon op kaart</span>
                    </button>
                    
                    <a
                      href={`https://ebird.org/species/${selectedSpecies.speciesCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                    >
                      <span>Meer informatie op eBird</span>
                      <FaInfoCircle className="ml-2" />
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 border border-gray-200 rounded-lg mt-4">
        <p>
          Gegevens van <a href="https://ebird.org" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">eBird</a>, 
          een project van het Cornell Lab of Ornithology
        </p>
      </div>
    </div>
  );
};

export default BirdingPage; 
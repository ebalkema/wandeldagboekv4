import { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaLeaf, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import { 
  getSpeciesInArea, 
  getObservationClusters, 
  searchTaxa,
  getCurrentDate,
  getLastMonth
} from '../services/biodiversityService';
import { useAuth } from '../context/AuthContext';
import LazyMapComponent from '../components/LazyMapComponent';

// Fallback locatie (Amsterdam)
const FALLBACK_LOCATION = {
  latitude: 52.3676,
  longitude: 4.9041
};

const BiodiversityPage = () => {
  const { currentUser } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [species, setSpecies] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeciesGroups, setSelectedSpeciesGroups] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: getLastMonth(),
    to: getCurrentDate()
  });
  const [radius, setRadius] = useState(5000); // 5 km
  const [speciesGroups, setSpeciesGroups] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [usingFallbackLocation, setUsingFallbackLocation] = useState(false);
  
  // Haal de huidige locatie op
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setUsingFallbackLocation(false);
        },
        (error) => {
          console.error('Fout bij het ophalen van locatie:', error);
          setError('Kon je locatie niet bepalen. Een standaardlocatie wordt gebruikt.');
          setCurrentLocation(FALLBACK_LOCATION);
          setUsingFallbackLocation(true);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setError('Geolocatie wordt niet ondersteund door je browser. Een standaardlocatie wordt gebruikt.');
      setCurrentLocation(FALLBACK_LOCATION);
      setUsingFallbackLocation(true);
    }
  }, []);
  
  // Haal taxonomische groepen op voor filters
  useEffect(() => {
    const fetchTaxonomicGroups = async () => {
      try {
        const taxa = await searchTaxa('', 'CLASS');
        const groups = taxa.map(taxon => ({
          id: taxon.id,
          name: taxon.vernacularName?.nl || taxon.scientificName,
          scientificName: taxon.scientificName
        }));
        setSpeciesGroups(groups);
      } catch (err) {
        console.error('Fout bij het ophalen van taxonomische groepen:', err);
        // Fallback wordt automatisch gebruikt door de searchTaxa functie
      }
    };
    
    fetchTaxonomicGroups();
  }, []);
  
  // Haal soorten op wanneer de locatie of filters veranderen
  useEffect(() => {
    const fetchBiodiversityData = async () => {
      if (!currentLocation) return;
      
      setLoading(true);
      setError(usingFallbackLocation ? 
        'Kon je locatie niet bepalen. Gegevens worden getoond voor een standaardlocatie.' : 
        null
      );
      
      try {
        const options = {
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
          speciesGroups: selectedSpeciesGroups
        };
        
        // Haal soorten op
        const speciesData = await getSpeciesInArea(
          currentLocation.latitude,
          currentLocation.longitude,
          radius,
          options
        );
        
        setSpecies(speciesData);
        
        // Haal clusters op als er mapBounds zijn
        if (mapBounds) {
          const clusterData = await getObservationClusters(
            mapBounds,
            options
          );
          
          setClusters(clusterData);
        }
      } catch (err) {
        console.error('Fout bij het ophalen van biodiversiteitsgegevens:', err);
        setError(usingFallbackLocation ?
          'Kon je locatie niet bepalen en er was een probleem bij het ophalen van biodiversiteitsgegevens.' :
          'Kon geen biodiversiteitsgegevens ophalen. Probeer het later opnieuw.'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchBiodiversityData();
  }, [currentLocation, radius, dateRange, selectedSpeciesGroups, mapBounds, usingFallbackLocation]);
  
  // Filter soorten op basis van zoekopdracht
  const filteredSpecies = searchQuery 
    ? species.filter(species => 
        (species.vernacularName?.nl || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        species.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : species;
  
  // Sorteer soorten op aantal waarnemingen (meest voorkomend eerst)
  const sortedSpecies = [...filteredSpecies].sort((a, b) => 
    (b.observationCount || 0) - (a.observationCount || 0)
  );
  
  const handleMapBoundsChange = (bounds) => {
    setMapBounds({
      north: bounds.getNorth(),
      east: bounds.getEast(),
      south: bounds.getSouth(),
      west: bounds.getWest()
    });
  };
  
  const handleSpeciesClick = (species) => {
    setSelectedSpecies(species);
  };
  
  const handleSpeciesGroupToggle = (groupId) => {
    setSelectedSpeciesGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };
  
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <FaLeaf className="text-primary-500 mr-2" />
        Biodiversiteit Verkenner
      </h1>
      
      {usingFallbackLocation && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaMapMarkerAlt className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Je locatie kon niet worden bepaald. Gegevens worden getoond voor een standaardlocatie.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Zoekbalk */}
      <div className="mb-4 relative">
        <div className="flex">
          <div className="relative flex-grow">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek soorten..."
              className="pl-10 w-full border-gray-300 rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="ml-2 px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter className="mr-2" />
            Filters
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-3">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Locatie en radius */}
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <FaMapMarkerAlt className="mr-1 text-primary-500" />
                Locatie en radius
              </h3>
              <div className="mb-2">
                <label className="block text-sm text-gray-600 mb-1">Zoekradius (km)</label>
                <select
                  id="radius"
                  className="border-gray-300 rounded-lg text-sm"
                  value={radius / 1000}
                  onChange={(e) => setRadius(Number(e.target.value) * 1000)}
                >
                  <option value="1">1 km</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                </select>
              </div>
            </div>
            
            {/* Datumbereik */}
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <FaCalendarAlt className="mr-1 text-primary-500" />
                Periode
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Van</label>
                  <input
                    type="date"
                    name="from"
                    className="border-gray-300 rounded-lg text-sm w-full"
                    value={dateRange.from}
                    onChange={handleDateRangeChange}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tot</label>
                  <input
                    type="date"
                    name="to"
                    className="border-gray-300 rounded-lg text-sm w-full"
                    value={dateRange.to}
                    onChange={handleDateRangeChange}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Soortgroepen */}
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Soortgroepen</h3>
            <div className="flex flex-wrap gap-2">
              {speciesGroups.map(group => (
                <button
                  key={group.id}
                  className={`px-3 py-1 text-xs rounded-full ${
                    selectedSpeciesGroups.includes(group.id) 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => handleSpeciesGroupToggle(group.id)}
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Kaart */}
      <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-64 sm:h-80">
          {currentLocation && (
            <LazyMapComponent 
              center={[currentLocation.latitude, currentLocation.longitude]} 
              zoom={12}
              clusters={clusters}
              onBoundsChange={handleMapBoundsChange}
            />
          )}
        </div>
      </div>
      
      {/* Resultaten */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-3">
          {loading ? 'Soorten laden...' : `${sortedSpecies.length} soorten gevonden`}
        </h2>
        
        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}
        
        {!loading && sortedSpecies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Geen soorten gevonden voor de huidige filters.
            Probeer de zoekcriteria aan te passen.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sortedSpecies.map(species => (
              <li 
                key={species.id} 
                className="py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSpeciesClick(species)}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{species.vernacularName?.nl || species.scientificName}</p>
                    <p className="text-xs text-gray-500 italic">{species.scientificName}</p>
                    <p className="text-xs text-gray-500">
                      {species.speciesGroup || 'Onbekende groep'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                      {species.observationCount || 0} waarnemingen
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {/* Bronvermelding */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Data van de Nederlandse Biodiversiteit API
        </div>
      </div>
      
      {/* Details modal */}
      {selectedSpecies && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">
                  {selectedSpecies.vernacularName?.nl || selectedSpecies.scientificName}
                </h2>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedSpecies(null)}
                >
                  ✕
                </button>
              </div>
              
              <p className="text-sm text-gray-500 italic mb-4">{selectedSpecies.scientificName}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Soortgroep</p>
                  <p className="font-medium">{selectedSpecies.speciesGroup || 'Onbekend'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Waarnemingen</p>
                  <p className="font-medium">{selectedSpecies.observationCount || 0}</p>
                </div>
              </div>
              
              {/* Hier zou je meer details kunnen toevoegen zoals afbeeldingen, beschrijvingen, etc. */}
              <p className="text-sm text-gray-600 mb-2">Laatste waarnemingen</p>
              <p className="text-sm">
                {selectedSpecies.lastObservationDate 
                  ? new Date(selectedSpecies.lastObservationDate).toLocaleDateString('nl-NL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Onbekend'
                }
              </p>
              
              <div className="mt-6 flex justify-end">
                <button
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg"
                  onClick={() => setSelectedSpecies(null)}
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiodiversityPage; 
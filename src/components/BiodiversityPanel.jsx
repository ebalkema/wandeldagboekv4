import { useState, useEffect } from 'react';
import { FaLeaf, FaInfoCircle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { getSpeciesInArea, getCurrentSeason } from '../services/biodiversityService';

/**
 * Component dat biodiversiteitsgegevens weergeeft voor de huidige locatie
 * @param {Object} props - Component properties
 * @param {Object} props.location - Huidige locatie {latitude, longitude}
 * @param {number} props.radius - Zoekradius in meters
 */
const BiodiversityPanel = ({ location, radius = 1000 }) => {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  
  const season = getCurrentSeason();
  
  // Haal soorten op wanneer de locatie verandert
  useEffect(() => {
    const fetchSpecies = async () => {
      if (!location?.latitude || !location?.longitude) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const options = {
          dateFrom: season.start,
          dateTo: season.end
        };
        
        const speciesData = await getSpeciesInArea(
          location.latitude,
          location.longitude,
          radius,
          options
        );
        
        setSpecies(speciesData);
      } catch (err) {
        console.error('Fout bij het ophalen van biodiversiteitsgegevens:', err);
        setError('Kon geen biodiversiteitsgegevens ophalen. Probeer het later opnieuw.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpecies();
  }, [location, radius, season.start, season.end]);
  
  // Groepeer soorten per categorie
  const groupedSpecies = species.reduce((groups, species) => {
    const group = species.speciesGroup || 'Overig';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(species);
    return groups;
  }, {});
  
  // Tel het aantal soorten per groep
  const speciesGroups = Object.keys(groupedSpecies).map(group => ({
    name: group,
    count: groupedSpecies[group].length
  }));
  
  // Filter soorten op basis van geselecteerde groep
  const filteredSpecies = selectedGroup === 'all' 
    ? species 
    : groupedSpecies[selectedGroup] || [];
  
  // Sorteer soorten op aantal waarnemingen (meest voorkomend eerst)
  const sortedSpecies = [...filteredSpecies].sort((a, b) => 
    (b.observationCount || 0) - (a.observationCount || 0)
  ).slice(0, 10); // Toon maximaal 10 soorten
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <FaLeaf className="text-primary-500 mr-2" />
          <h2 className="text-lg font-semibold">Biodiversiteit in dit gebied</h2>
        </div>
        {expanded ? <FaChevronUp /> : <FaChevronDown />}
      </div>
      
      {expanded && (
        <div className="mt-3">
          {loading ? (
            <p className="text-gray-500 text-center py-4">Gegevens laden...</p>
          ) : error ? (
            <p className="text-red-500 text-center py-2">{error}</p>
          ) : species.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Geen soortgegevens beschikbaar voor deze locatie.
            </p>
          ) : (
            <>
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">{species.length}</span> soorten gevonden in dit gebied tijdens {season.name}
                </p>
                
                {/* Soortgroepen tabs */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    className={`px-3 py-1 text-xs rounded-full ${
                      selectedGroup === 'all' 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => setSelectedGroup('all')}
                  >
                    Alle ({species.length})
                  </button>
                  
                  {speciesGroups.map(group => (
                    <button
                      key={group.name}
                      className={`px-3 py-1 text-xs rounded-full ${
                        selectedGroup === group.name 
                          ? 'bg-primary-500 text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => setSelectedGroup(group.name)}
                    >
                      {group.name} ({group.count})
                    </button>
                  ))}
                </div>
                
                {/* Soortenlijst */}
                <ul className="divide-y divide-gray-100">
                  {sortedSpecies.map(species => (
                    <li key={species.id} className="py-2">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{species.vernacularName?.nl || species.scientificName}</p>
                          <p className="text-xs text-gray-500 italic">{species.scientificName}</p>
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
                
                {species.length > 10 && selectedGroup === 'all' && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Toon de 10 meest voorkomende soorten van {species.length} totaal.
                  </p>
                )}
                
                <div className="mt-3 text-xs text-gray-500 flex items-center">
                  <FaInfoCircle className="mr-1" />
                  <span>Data van Nederlandse Biodiversiteit API</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BiodiversityPanel; 
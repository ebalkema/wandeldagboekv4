import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getWalk, getWalkObservations } from '../services/firestoreService';
import { formatDate, formatTime, formatDuration, getDurationInMinutes } from '../utils/dateUtils';
import { formatDistance } from '../services/locationService';
import { suggestWalkToJournal, checkJournalApiSupport } from '../services/journalService';
import LazyMapComponent from '../components/LazyMapComponent';
import WeatherDisplay from '../components/WeatherDisplay';
import ObservationItem from '../components/ObservationItem';
import BirdObservations from '../components/BirdObservations';
import { FaShare, FaBook, FaBinoculars } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

/**
 * Pagina voor het weergeven van een samenvatting van een voltooide wandeling
 */
const WalkSummaryPage = () => {
  const { walkId } = useParams();
  const navigate = useNavigate();
  const { userSettings } = useAuth();
  
  const [walk, setWalk] = useState(null);
  const [observations, setObservations] = useState([]);
  const [pathPoints, setPathPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJournalSupported, setIsJournalSupported] = useState(false);
  const [sharingToJournal, setSharingToJournal] = useState(false);
  const [selectedBirdLocation, setSelectedBirdLocation] = useState(null);
  const [showBirdsOnMap, setShowBirdsOnMap] = useState(false);

  // Controleer of Journal API wordt ondersteund
  useEffect(() => {
    setIsJournalSupported(checkJournalApiSupport());
  }, []);

  // Haal wandelgegevens op
  useEffect(() => {
    const fetchWalkData = async () => {
      if (!walkId) return;
      
      try {
        const walkData = await getWalk(walkId);
        if (!walkData) {
          setError('Wandeling niet gevonden');
          return;
        }
        
        setWalk(walkData);
        
        // Haal observaties op
        const observationsData = await getWalkObservations(walkId);
        
        // Dedupliceer observaties
        const uniqueObservations = [];
        const observationIds = new Set();
        const observationTexts = new Set();
        
        observationsData.forEach(obs => {
          // Als deze ID al is toegevoegd, sla over
          if (observationIds.has(obs.id)) return;
          
          // Als er een zeer vergelijkbare observatie is (zelfde tekst en locatie), sla over
          const obsKey = `${obs.text}-${obs.location?.lat}-${obs.location?.lng}`;
          if (observationTexts.has(obsKey)) return;
          
          // Voeg toe aan unieke observaties
          uniqueObservations.push(obs);
          observationIds.add(obs.id);
          observationTexts.add(obsKey);
        });
        
        console.log(`Origineel aantal observaties: ${observationsData.length}, Na deduplicatie: ${uniqueObservations.length}`);
        setObservations(uniqueObservations);
        
        // Zet pathPoints
        if (walkData.pathPoints && Object.keys(walkData.pathPoints).length > 0) {
          // Converteer pathPoints naar het juiste formaat voor de kaart
          let points = [];
          
          // Controleer of pathPoints een array is
          if (Array.isArray(walkData.pathPoints)) {
            // Sorteer op index als beschikbaar
            const sortedPoints = [...walkData.pathPoints].sort((a, b) => {
              if (a.index !== undefined && b.index !== undefined) {
                return a.index - b.index;
              }
              return 0;
            });
            
            // Converteer naar [lat, lng] formaat voor de kaart
            points = sortedPoints.map(point => {
              if (Array.isArray(point)) {
                return point; // Al in het juiste formaat
              } else if (point.lat !== undefined && point.lng !== undefined) {
                return [point.lat, point.lng];
              }
              return null;
            }).filter(point => point !== null);
          } else {
            // Het kan een object zijn met geneste punten
            const keys = Object.keys(walkData.pathPoints);
            // Sorteer de keys numeriek als mogelijk
            const sortedKeys = keys.sort((a, b) => {
              const numA = parseInt(a);
              const numB = parseInt(b);
              if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
              }
              return 0;
            });
            
            points = sortedKeys.map(key => {
              const point = walkData.pathPoints[key];
              if (Array.isArray(point)) {
                return point;
              } else if (point && point.lat !== undefined && point.lng !== undefined) {
                return [point.lat, point.lng];
              }
              return null;
            }).filter(point => point !== null);
          }
          
          console.log(`Wandelpad punten: ${points.length}`);
          if (points.length > 0) {
            console.log('Eerste punt:', points[0], 'Laatste punt:', points[points.length - 1]);
          }
          
          setPathPoints(points);
        } else {
          console.warn('Geen pathPoints gevonden in wandeldata');
        }
      } catch (error) {
        console.error('Fout bij het ophalen van wandelgegevens:', error);
        setError('Kon wandelgegevens niet laden');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalkData();
  }, [walkId]);

  // Bereken de duur van de wandeling
  const calculateDuration = () => {
    if (!walk || !walk.startTime || !walk.endTime) return null;
    
    return getDurationInMinutes(
      new Date(walk.startTime.seconds * 1000),
      new Date(walk.endTime.seconds * 1000)
    );
  };

  // Deel wandeling met Apple Journal
  const handleShareToJournal = async () => {
    if (!walk) return;
    
    try {
      setSharingToJournal(true);
      const success = await suggestWalkToJournal(walk, observations);
      
      if (success) {
        alert('Wandeling succesvol gedeeld met Apple Journal');
      } else {
        alert('Kon wandeling niet delen met Apple Journal');
      }
    } catch (error) {
      console.error('Fout bij het delen met Apple Journal:', error);
      alert('Er is een fout opgetreden bij het delen met Apple Journal');
    } finally {
      setSharingToJournal(false);
    }
  };

  // Deel wandeling via andere methoden
  const handleShare = () => {
    if (!walk) return;
    
    // Bereid de tekst voor
    let shareText = `Wandeling: ${walk.name}\n`;
    
    if (walk.distance) {
      shareText += `Afstand: ${formatDistance(walk.distance)}\n`;
    }
    
    const duration = calculateDuration();
    if (duration) {
      shareText += `Duur: ${formatDuration(duration)}\n`;
    }
    
    if (observations.length > 0) {
      shareText += `Observaties: ${observations.length}\n`;
    }
    
    // Gebruik de Web Share API als beschikbaar
    if (navigator.share) {
      navigator.share({
        title: `Wandeling: ${walk.name}`,
        text: shareText,
        // URL zou naar je app kunnen verwijzen
        url: window.location.href
      }).catch(error => {
        console.error('Fout bij het delen:', error);
      });
    } else {
      // Fallback als Web Share API niet beschikbaar is
      alert(`Deel deze wandeling:\n\n${shareText}`);
    }
  };

  // Functie om een vogellocatie te selecteren op de kaart
  const handleBirdLocationSelect = (location, showAll = false) => {
    setSelectedBirdLocation(location);
    setShowBirdsOnMap(true);
  };

  // Functie om terug te gaan naar de normale kaartweergave
  const handleResetMapView = () => {
    setSelectedBirdLocation(null);
    setShowBirdsOnMap(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-gray-600">Wandeling laden...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
        >
          Terug naar dashboard
        </button>
      </div>
    );
  }

  if (!walk) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <p>Wandeling niet gevonden</p>
        <Link
          to="/"
          className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Terug naar dashboard
        </Link>
      </div>
    );
  }

  const duration = calculateDuration();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{walk?.name || 'Wandelsamenvatting'}</h1>
      
      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Wandelgegevens laden...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-red-600">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Kaart */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            {showBirdsOnMap && (
              <div className="bg-primary-50 p-2 flex justify-between items-center">
                <div className="flex items-center">
                  <FaBinoculars className="text-primary-600 mr-2" />
                  <span className="text-sm font-medium">
                    {selectedBirdLocation && !Array.isArray(selectedBirdLocation) 
                      ? `${selectedBirdLocation.dutchName || selectedBirdLocation.name} op kaart` 
                      : 'Vogelwaarnemingen op kaart'}
                  </span>
                </div>
                <button 
                  onClick={handleResetMapView}
                  className="text-xs bg-white text-primary-600 border border-primary-300 px-2 py-1 rounded hover:bg-primary-50"
                >
                  Terug naar wandeling
                </button>
              </div>
            )}
            <div className="h-64 sm:h-80">
              <LazyMapComponent 
                center={walk?.startLocation ? [walk.startLocation.lat, walk.startLocation.lng] : null}
                pathPoints={pathPoints}
                observations={observations}
                birdLocations={selectedBirdLocation}
                showTimestamps={true}
              />
            </div>
          </div>
          
          {/* Wandelgegevens */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Afstand</p>
                <p className="text-xl font-bold text-primary-600">
                  {walk?.distance ? (walk.distance / 1000).toFixed(2) : '0'} km
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 text-sm">Duur</p>
                <p className="text-xl font-bold text-primary-600">
                  {calculateDuration() || '0 min'}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 text-sm">Observaties</p>
                <p className="text-xl font-bold text-primary-600">
                  {observations.length}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 text-sm">Weer</p>
                <div className="flex justify-center">
                  {walk?.weather ? (
                    <WeatherDisplay weather={walk.weather} iconSize="md" />
                  ) : (
                    <span className="text-xl font-bold text-primary-600">-</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-2 mt-4">
              <button
                onClick={handleShare}
                className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              >
                <FaShare className="mr-2" />
                Delen
              </button>
              
              {isJournalSupported && (
                <button
                  onClick={handleShareToJournal}
                  className="bg-secondary-600 text-white py-2 px-4 rounded-lg hover:bg-secondary-700 transition-colors flex items-center"
                  disabled={sharingToJournal}
                >
                  <FaBook className="mr-2" />
                  {sharingToJournal ? 'Delen...' : 'Naar Journal'}
                </button>
              )}
            </div>
          </div>
          
          {/* Observaties */}
          {observations.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Observaties</h2>
              <div className="space-y-4">
                {observations.map(observation => (
                  <ObservationItem 
                    key={observation.id} 
                    observation={observation} 
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center text-gray-500">
              <p>Geen observaties voor deze wandeling</p>
            </div>
          )}
          
          {/* Vogelwaarnemingen */}
          {walk?.startLocation && (
            <div className="mb-6">
              <BirdObservations 
                location={{ lat: walk.startLocation.lat, lng: walk.startLocation.lng }} 
                radius={userSettings?.birdRadius}
                onBirdLocationSelect={handleBirdLocationSelect}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WalkSummaryPage; 
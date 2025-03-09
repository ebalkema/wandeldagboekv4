import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getWalk, getWalkObservations } from '../services/firestoreService';
import { formatDate, formatTime, formatDuration, getDurationInMinutes } from '../utils/dateUtils';
import { formatDistance } from '../services/locationService';
import { suggestWalkToJournal, checkJournalApiSupport } from '../services/journalService';
import MapComponent from '../components/MapComponent';
import WeatherDisplay from '../components/WeatherDisplay';
import ObservationItem from '../components/ObservationItem';

/**
 * Pagina voor het weergeven van een samenvatting van een voltooide wandeling
 */
const WalkSummaryPage = () => {
  const { walkId } = useParams();
  const navigate = useNavigate();
  
  const [walk, setWalk] = useState(null);
  const [observations, setObservations] = useState([]);
  const [pathPoints, setPathPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJournalSupported, setIsJournalSupported] = useState(false);
  const [sharingToJournal, setSharingToJournal] = useState(false);

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
        setObservations(observationsData);
        
        // Zet pathPoints
        if (walkData.pathPoints && walkData.pathPoints.length > 0) {
          const points = walkData.pathPoints.map(point => [point.lat, point.lng]);
          setPathPoints(points);
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
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{walk.name}</h1>
        
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-800"
        >
          Terug naar dashboard
        </Link>
      </div>
      
      {/* Kaart sectie */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="h-64">
          <MapComponent 
            pathPoints={pathPoints}
            observations={observations}
            height="100%"
            showCurrentLocation={false}
          />
        </div>
      </div>
      
      {/* Wandelinformatie */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Samenvatting</h2>
          
          {walk.weather && (
            <WeatherDisplay weather={walk.weather} size="small" />
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Datum</h3>
            <p className="text-lg text-gray-800">
              {walk.startTime && formatDate(new Date(walk.startTime.seconds * 1000))}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Tijd</h3>
            <p className="text-lg text-gray-800">
              {walk.startTime && formatTime(new Date(walk.startTime.seconds * 1000))} - 
              {walk.endTime && formatTime(new Date(walk.endTime.seconds * 1000))}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Duur</h3>
            <p className="text-lg text-gray-800">
              {duration ? formatDuration(duration) : 'Onbekend'}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Afstand</h3>
            <p className="text-lg text-gray-800">
              {walk.distance ? formatDistance(walk.distance) : '0 m'}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Observaties</h3>
            <p className="text-lg text-gray-800">
              {observations.length}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Weer</h3>
            <p className="text-lg text-gray-800">
              {walk.weather ? walk.weather.description : 'Onbekend'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Observaties sectie */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Observaties</h2>
        
        {observations.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600">Geen observaties voor deze wandeling</p>
          </div>
        ) : (
          <div className="space-y-4">
            {observations.map(observation => (
              <ObservationItem 
                key={observation.id} 
                observation={observation} 
                onClick={() => {}} 
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Deel knoppen */}
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
        <button
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          onClick={handleShare}
        >
          Deel deze wandeling
        </button>
        
        {isJournalSupported && (
          <button
            className="bg-gray-800 text-white py-2 px-6 rounded-lg hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center"
            onClick={handleShareToJournal}
            disabled={sharingToJournal}
          >
            {sharingToJournal ? (
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            )}
            Deel met Apple Journal
          </button>
        )}
      </div>
    </div>
  );
};

export default WalkSummaryPage; 
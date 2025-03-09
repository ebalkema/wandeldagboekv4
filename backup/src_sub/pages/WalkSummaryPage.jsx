import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getWalk, getWalkObservations } from '../services/firestoreService';
import { formatDate, formatTime, formatDuration, getDurationInMinutes } from '../utils/dateUtils';
import { formatDistance } from '../services/locationService';
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
      
      {/* Deel knop */}
      <div className="mt-6 flex justify-center">
        <button
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          onClick={() => {
            // Implementeer delen functionaliteit
            alert('Delen functionaliteit nog niet geïmplementeerd');
          }}
        >
          Deel deze wandeling
        </button>
      </div>
    </div>
  );
};

export default WalkSummaryPage; 
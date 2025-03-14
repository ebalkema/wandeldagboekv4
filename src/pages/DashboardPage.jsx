import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserWalks } from '../services/firestoreService';
import { getCurrentLocation } from '../services/locationService';
import { getCachedWeatherData } from '../services/weatherService';
import { useVoice } from '../context/VoiceContext';
import WalkCard from '../components/WalkCard';
import VoiceButton from '../components/VoiceButton';

/**
 * Dashboard pagina
 */
const DashboardPage = () => {
  const { currentUser } = useAuth();
  const { processCommand } = useVoice();
  const navigate = useNavigate();
  
  const [walks, setWalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);

  // Haal wandelingen op
  useEffect(() => {
    const fetchWalks = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const walksData = await getUserWalks(currentUser.uid);
        setWalks(walksData);
      } catch (error) {
        console.error('Fout bij het ophalen van wandelingen:', error);
        setError('Kon wandelingen niet laden. Probeer het later opnieuw.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalks();
  }, [currentUser]);

  // Haal locatie op
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const currentLocation = await getCurrentLocation();
        setLocation(currentLocation);
      } catch (error) {
        console.error('Fout bij het ophalen van locatie:', error);
      }
    };
    
    fetchLocation();
  }, []);

  // Verwerk spraakcommando's
  const handleVoiceCommand = (text) => {
    if (!text) return;
    
    const command = processCommand(text);
    
    if (command) {
      switch (command.type) {
        case 'NEW_WALK':
          navigate('/new-walk');
          break;
        case 'VIEW_WALKS':
          navigate('/walks');
          break;
        default:
          // Geen actie voor andere commando's
          break;
      }
    }
  };

  // Vind actieve wandeling
  const activeWalk = walks.find(walk => !walk.endTime);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Actieve wandeling */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Actieve wandeling</h2>
        
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <svg className="animate-spin h-6 w-6 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : activeWalk ? (
          <WalkCard walk={activeWalk} />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 mb-4">Je hebt geen actieve wandeling.</p>
            <Link
              to="/new-walk"
              className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-200 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start een nieuwe wandeling
            </Link>
          </div>
        )}
      </div>

      {/* Recente wandelingen */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recente wandelingen</h2>
          <Link to="/walks" className="text-primary-600 hover:underline text-sm">
            Bekijk alle wandelingen
          </Link>
        </div>
        
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <svg className="animate-spin h-6 w-6 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : walks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600">Je hebt nog geen wandelingen. Start je eerste wandeling!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {walks
              .filter(walk => walk.endTime) // Alleen voltooide wandelingen
              .slice(0, 3) // Maximaal 3 wandelingen
              .map(walk => (
                <WalkCard key={walk.id} walk={walk} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage; 
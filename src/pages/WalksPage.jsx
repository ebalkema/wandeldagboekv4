import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserWalks } from '../services/firestoreService';
import { getOfflineWalks } from '../services/offlineService';
import WalkCard from '../components/WalkCard';
import { FaLeaf } from 'react-icons/fa';

/**
 * Pagina voor het weergeven van alle wandelingen
 */
const WalksPage = () => {
  const { currentUser } = useAuth();
  
  const [walks, setWalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  // Haal wandelingen op
  useEffect(() => {
    const fetchWalks = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Haal online wandelingen op
        const onlineWalks = await getUserWalks(currentUser.uid, 100);
        
        // Haal offline wandelingen op
        const offlineWalks = getOfflineWalks();
        
        // Combineer en verwijder duplicaten
        const combinedWalks = [...onlineWalks];
        
        // Voeg offline wandelingen toe die nog niet in de online lijst staan
        offlineWalks.forEach(offlineWalk => {
          if (!combinedWalks.some(walk => walk.id === offlineWalk.id)) {
            combinedWalks.push(offlineWalk);
          }
        });
        
        setWalks(combinedWalks);
        console.log('Wandelingen geladen:', combinedWalks.length);
      } catch (error) {
        console.error('Fout bij het ophalen van wandelingen:', error);
        setError('Kon wandelingen niet laden. Probeer het later opnieuw.');
        
        // Probeer alleen offline wandelingen te laden als er een fout is
        try {
          const offlineWalks = getOfflineWalks();
          setWalks(offlineWalks);
          console.log('Alleen offline wandelingen geladen:', offlineWalks.length);
        } catch (offlineError) {
          console.error('Fout bij het ophalen van offline wandelingen:', offlineError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalks();
  }, [currentUser]);

  // Filter de wandelingen
  const filteredWalks = walks.filter(walk => {
    if (filter === 'all') return true;
    if (filter === 'active') return !walk.endTime;
    if (filter === 'completed') return !!walk.endTime;
    return true;
  });

  // Sorteer de wandelingen op startdatum (nieuwste eerst)
  const sortedWalks = [...filteredWalks].sort((a, b) => {
    // Haal timestamps op, rekening houdend met verschillende formaten
    const getTimestamp = (walk) => {
      if (!walk.startTime) return 0;
      
      // Voor Firestore timestamp
      if (walk.startTime.seconds) {
        return walk.startTime.seconds;
      }
      
      // Voor ISO string (offline modus)
      if (typeof walk.startTime === 'string') {
        return new Date(walk.startTime).getTime() / 1000;
      }
      
      return 0;
    };
    
    return getTimestamp(b) - getTimestamp(a);
  });

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Mijn wandelingen</h1>
        
        <Link
          to="/new-walk"
          className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-200"
        >
          Nieuwe wandeling
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter knoppen */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            filter === 'active'
              ? 'bg-secondary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Actief
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            filter === 'completed'
              ? 'bg-accent-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Voltooid
        </button>
      </div>

      {/* Wandelingen lijst */}
      {loading ? (
        <div className="text-center py-8">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Wandelingen laden...</p>
        </div>
      ) : sortedWalks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FaLeaf className="h-12 w-12 text-primary-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {filter === 'all'
              ? 'Je hebt nog geen wandelingen. Start je eerste wandeling!'
              : filter === 'active'
              ? 'Je hebt geen actieve wandelingen.'
              : 'Je hebt nog geen voltooide wandelingen.'}
          </p>
          
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-primary-600 hover:underline"
            >
              Bekijk alle wandelingen
            </button>
          )}
          
          <div className="mt-6 text-xs text-gray-500">
            <p>
              Een podcast-project van{' '}
              <a 
                href="https://www.mennoenerwin.nl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Menno & Erwin
              </a>
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="space-y-4 mb-8">
            {sortedWalks.map(walk => (
              <WalkCard key={walk.id} walk={walk} />
            ))}
          </div>
          
          <div className="text-center text-xs text-gray-500 pb-4">
            <p>
              Een podcast-project van{' '}
              <a 
                href="https://www.mennoenerwin.nl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Menno & Erwin
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalksPage; 
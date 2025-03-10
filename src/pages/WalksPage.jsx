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
        const offlineWalks = getOfflineWalks();
        if (offlineWalks.length > 0) {
          setWalks(offlineWalks);
          console.log('Offline wandelingen geladen:', offlineWalks.length);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalks();
  }, [currentUser]);

  // Functie om timestamp te krijgen voor sortering
  const getTimestamp = (walk) => {
    if (walk.endTime) return walk.endTime;
    if (walk.startTime) return walk.startTime;
    return 0;
  };

  // Filter en sorteer wandelingen
  const filteredWalks = walks
    .filter(walk => {
      if (filter === 'all') return true;
      if (filter === 'active') return !walk.endTime;
      if (filter === 'completed') return !!walk.endTime;
      return true;
    })
    .sort((a, b) => getTimestamp(b) - getTimestamp(a));

  return (
    <div className="space-y-6">
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Wandelingen laden...</p>
        </div>
      ) : filteredWalks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FaLeaf className="text-primary-500 text-4xl mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Geen wandelingen gevonden</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all' 
              ? 'Je hebt nog geen wandelingen. Start je eerste wandeling!' 
              : filter === 'active' 
                ? 'Je hebt geen actieve wandelingen.' 
                : 'Je hebt nog geen voltooide wandelingen.'}
          </p>
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
      ) : (
        <div className="space-y-4">
          {filteredWalks.map(walk => (
            <WalkCard key={walk.id} walk={walk} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WalksPage; 
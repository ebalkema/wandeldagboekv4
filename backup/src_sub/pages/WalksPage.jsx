import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserWalks } from '../services/firestoreService';
import WalkCard from '../components/WalkCard';

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
        // Haal alle wandelingen op (geen limiet)
        const walksData = await getUserWalks(currentUser.uid, 100);
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

  // Filter de wandelingen
  const filteredWalks = walks.filter(walk => {
    if (filter === 'all') return true;
    if (filter === 'active') return !walk.endTime;
    if (filter === 'completed') return !!walk.endTime;
    return true;
  });

  // Sorteer de wandelingen op startdatum (nieuwste eerst)
  const sortedWalks = [...filteredWalks].sort((a, b) => {
    if (!a.startTime || !b.startTime) return 0;
    return b.startTime.seconds - a.startTime.seconds;
  });

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Mijn wandelingen</h1>
        
        <Link
          to="/new-walk"
          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
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
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Actief
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
            filter === 'completed'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Voltooid
        </button>
      </div>

      {/* Wandelingen lijst */}
      {loading ? (
        <div className="text-center py-8">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Wandelingen laden...</p>
        </div>
      ) : sortedWalks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
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
              className="text-blue-600 hover:underline"
            >
              Bekijk alle wandelingen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedWalks.map(walk => (
            <WalkCard key={walk.id} walk={walk} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WalksPage; 
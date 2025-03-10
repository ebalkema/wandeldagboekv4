import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaLeaf, FaPodcast, FaExternalLinkAlt, FaPlus, FaStop, FaWalking, FaCamera } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

// Website URL
const WEBSITE_URL = 'https://www.mennoenerwin.nl';

/**
 * Component voor de navigatiebalk
 */
const Header = ({ onAddObservation }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const currentPath = location.pathname;
  
  // Bepaal de titel op basis van het huidige pad
  const getTitle = () => {
    if (currentPath === '/') return 'Dashboard';
    if (currentPath === '/walks') return 'Wandelingen';
    if (currentPath === '/new-walk') return 'Nieuwe wandeling';
    if (currentPath.includes('/active-walk/')) return 'Actieve wandeling';
    if (currentPath.includes('/walk-summary/') || currentPath.includes('/walk/')) return 'Wandelsamenvatting';
    if (currentPath === '/profile') return 'Profiel';
    if (currentPath === '/podcast') return 'Menno & Erwin Podcast';
    if (currentPath === '/biodiversity') return 'Biodiversiteit';
    if (currentPath === '/settings') return 'Instellingen';
    return 'Wandeldagboek';
  };
  
  // Controleer of we op een actieve wandelingspagina zijn
  const isActivePage = currentPath.includes('/active-walk/');
  
  // Controleer of we op de podcast pagina zijn
  const isPodcastPage = currentPath === '/podcast';
  
  // Haal het wandeling ID uit het pad
  const getWalkId = () => {
    if (isActivePage) {
      const parts = currentPath.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };
  
  // Functie om een nieuwe wandeling te starten
  const handleStartWalk = () => {
    navigate('/new-walk');
  };
  
  // Functie om een observatie toe te voegen
  const handleAddObservation = () => {
    if (onAddObservation && typeof onAddObservation === 'function') {
      onAddObservation();
    }
  };
  
  return (
    <header className="bg-primary-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo en titel */}
          <Link to="/" className="flex items-center">
            {isPodcastPage ? (
              <FaPodcast className="h-6 w-6 mr-2 flex-shrink-0" />
            ) : (
              <FaLeaf className="h-6 w-6 mr-2 flex-shrink-0" />
            )}
            <span className="text-lg font-bold truncate">{getTitle()}</span>
          </Link>

          {/* Actieknoppen voor specifieke pagina's */}
          <div className="flex space-x-2">
            {isActivePage ? (
              <>
                {/* Knop voor observatie toevoegen */}
                <button
                  onClick={handleAddObservation}
                  className="bg-secondary-600 hover:bg-secondary-700 px-3 py-1 rounded-md text-sm transition-colors duration-200 flex items-center"
                >
                  <FaCamera className="mr-1" />
                  <span className="hidden sm:inline">Observatie</span>
                </button>
                
                {/* Knop voor wandeling beëindigen */}
                <Link
                  to={`/walk/${getWalkId()}`}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-sm transition-colors duration-200 flex items-center"
                >
                  <FaStop className="mr-1" />
                  <span className="hidden sm:inline">Beëindigen</span>
                </Link>
              </>
            ) : (
              <>
                {/* Knop voor wandeling starten */}
                {!isPodcastPage && currentUser && (
                  <button
                    onClick={handleStartWalk}
                    className="bg-primary-700 hover:bg-primary-800 px-3 py-1 rounded-md text-sm transition-colors duration-200 flex items-center mr-2"
                  >
                    <FaWalking className="mr-1" />
                    <span className="hidden sm:inline">Wandelen</span>
                  </button>
                )}
                
                {/* Link naar website */}
                <a
                  href={WEBSITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/80 hover:text-white transition-colors duration-200 flex items-center"
                >
                  <span className="hidden sm:inline">Bezoek www.mennoenerwin.nl</span>
                  <span className="sm:hidden">mennoenerwin.nl</span>
                  <FaExternalLinkAlt className="ml-1 h-3 w-3" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Podcast banner */}
      <div className="bg-secondary-600 text-white text-xs py-1 text-center">
        <a 
          href={`${WEBSITE_URL}/afleveringen`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline flex items-center justify-center"
        >
          <FaPodcast className="mr-1" />
          Ontdek de natuur met de Menno & Erwin podcast - Bekijk de nieuwste afleveringen
          <FaExternalLinkAlt className="ml-1 h-3 w-3" />
        </a>
      </div>
    </header>
  );
};

export default Header; 
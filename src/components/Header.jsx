import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaLeaf, FaPodcast, FaExternalLinkAlt, FaPlus, FaStop, FaWalking, FaCamera } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

// Website URL
const WEBSITE_URL = 'https://www.mennoenerwin.nl';

// App naam
const APP_NAME = 'Wandeldagboek';

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
    return 'Dashboard';
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
      {/* App naam altijd bovenaan */}
      <div className="bg-primary-700 py-1 text-center">
        <h1 className="text-sm font-bold">{APP_NAME}</h1>
      </div>
      
      <div className="container mx-auto px-2 py-2 sm:px-4 sm:py-3">
        <div className="flex justify-between items-center">
          {/* Logo en pagina titel */}
          <Link to="/" className="flex items-center">
            {isPodcastPage ? (
              <FaPodcast className="h-5 w-5 mr-1.5 flex-shrink-0" />
            ) : (
              <FaLeaf className="h-5 w-5 mr-1.5 flex-shrink-0" />
            )}
            <span className="text-base sm:text-lg font-bold truncate">{getTitle()}</span>
          </Link>

          {/* Actieknoppen voor specifieke pagina's */}
          <div className="flex space-x-1 sm:space-x-2">
            {isActivePage ? (
              <>
                {/* Knop voor observatie toevoegen */}
                <button
                  onClick={handleAddObservation}
                  className="bg-secondary-600 hover:bg-secondary-700 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition-colors duration-200 flex items-center"
                  aria-label="Observatie toevoegen"
                >
                  <FaCamera className="mr-1" />
                  <span className="hidden sm:inline">Observatie</span>
                </button>
                
                {/* Knop voor wandeling beëindigen */}
                <Link
                  to={`/walk/${getWalkId()}`}
                  className="bg-red-600 hover:bg-red-700 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition-colors duration-200 flex items-center"
                  aria-label="Wandeling beëindigen"
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
                    className="bg-primary-700 hover:bg-primary-800 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition-colors duration-200 flex items-center mr-1 sm:mr-2"
                    aria-label="Wandeling starten"
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
                  aria-label="Bezoek Menno & Erwin website"
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
      
      {/* Podcast banner - alleen op grotere schermen */}
      <div className="bg-secondary-600 text-white text-xs py-1 text-center hidden sm:block">
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
      
      {/* Verkorte podcast banner - alleen op mobiel */}
      <div className="bg-secondary-600 text-white text-xs py-1 text-center sm:hidden">
        <a 
          href={`${WEBSITE_URL}/afleveringen`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline flex items-center justify-center"
        >
          <FaPodcast className="mr-1" />
          Menno & Erwin podcast
          <FaExternalLinkAlt className="ml-1 h-3 w-3" />
        </a>
      </div>
    </header>
  );
};

export default Header; 
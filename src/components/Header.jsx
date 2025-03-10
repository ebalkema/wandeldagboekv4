import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaLeaf, FaPodcast, FaStop, FaWalking, FaCamera } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import VoiceButton from './VoiceButton';
import { useVoice } from '../context/VoiceContext';

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
  const { processCommand } = useVoice();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  // Controleer schermgrootte en pas aan wanneer deze verandert
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  // Functie om spraakcommando's te verwerken
  const handleVoiceCommand = (text) => {
    const command = processCommand(text);
    if (!command) return;

    switch (command.type) {
      case 'NEW_WALK':
        navigate('/new-walk');
        break;
      case 'VIEW_WALKS':
        navigate('/walks');
        break;
      case 'GO_DASHBOARD':
        navigate('/');
        break;
      case 'NEW_OBSERVATION':
        if (isActivePage && onAddObservation) {
          onAddObservation();
        }
        break;
      default:
        console.log('Onbekend commando:', command);
    }
  };
  
  // Gemeenschappelijke stijl voor actieknoppen
  const buttonStyle = "px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition-colors duration-200 flex items-center";
  
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
          <div className="flex space-x-1 sm:space-x-2 items-center">
            {/* Spraakopnameknop altijd zichtbaar */}
            <VoiceButton 
              onResult={handleVoiceCommand}
              size={isMobile ? "xsmall" : "small"}
              color="secondary"
              label={isMobile ? "" : "Spraak"}
              stopLabel={isMobile ? "" : "Stop"}
              className="mr-1"
            />

            {isActivePage ? (
              <>
                {/* Knop voor observatie toevoegen */}
                <button
                  onClick={handleAddObservation}
                  className={`${buttonStyle} bg-secondary-600 hover:bg-secondary-700`}
                  aria-label="Observatie toevoegen"
                >
                  <FaCamera className="mr-1" />
                  <span className="hidden sm:inline">Observatie</span>
                </button>
                
                {/* Knop voor wandeling beëindigen */}
                <Link
                  to={`/walk/${getWalkId()}`}
                  className={`${buttonStyle} bg-red-600 hover:bg-red-700`}
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
                    className={`${buttonStyle} bg-primary-700 hover:bg-primary-800`}
                    aria-label="Wandeling starten"
                  >
                    <FaWalking className="mr-1" />
                    <span className="hidden sm:inline">Wandelen</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
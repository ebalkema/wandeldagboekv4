import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaLeaf, FaPodcast, FaStop, FaWalking, FaCamera, FaHome, FaRoute, FaBinoculars, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import VoiceButton from './VoiceButton';
import { useVoice } from '../context/VoiceContext';

// App naam
const APP_NAME = 'Wandeldagboek';

/**
 * Component voor de navigatiebalk
 */
const Header = ({ onAddObservation, onEndWalk }) => {
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
    if (currentPath === '/birding') return 'Vogelwaarnemingen';
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
  
  // Voeg een observatie toe aan de actieve wandeling
  const handleAddObservation = () => {
    if (onAddObservation) {
      onAddObservation();
    }
  };
  
  // Beëindig de actieve wandeling
  const handleEndWalk = () => {
    if (onEndWalk) {
      onEndWalk();
    } else {
      // Als er geen onEndWalk functie is meegegeven, navigeer naar de wandelsamenvatting
      const walkId = getWalkId();
      if (walkId) {
        navigate(`/walk/${walkId}`);
      }
    }
  };
  
  // Verwerk spraakcommando's
  const handleVoiceCommand = (command) => {
    if (processCommand) {
      processCommand(command);
    }
  };
  
  // Stijl voor knoppen
  const buttonStyle = "flex items-center justify-center px-2 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors";
  
  return (
    <header className="bg-primary-600 text-white shadow-md">
      <div className="container mx-auto px-2 py-2">
        <div className="flex justify-between items-center">
          {/* Logo en app naam */}
          <Link to="/" className="flex items-center">
            <FaLeaf className="h-5 w-5 mr-1.5 flex-shrink-0" />
            <span className="text-sm font-semibold">{APP_NAME}</span>
          </Link>

          {/* Titel in het midden */}
          <div className="text-center">
            <span className="text-base font-bold">{getTitle()}</span>
          </div>

          {/* Actieknoppen voor specifieke pagina's */}
          <div className="flex space-x-1 items-center">
            {/* Spraakopnameknop altijd zichtbaar */}
            <VoiceButton 
              onResult={handleVoiceCommand}
              size="xsmall"
              color="secondary"
              label=""
              stopLabel=""
              className="mr-1"
            />

            {isActivePage && (
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
                <button
                  onClick={handleEndWalk}
                  className={`${buttonStyle} bg-red-600 hover:bg-red-700`}
                  aria-label="Wandeling beëindigen"
                >
                  <FaStop className="mr-1" />
                  <span className="hidden sm:inline">Beëindigen</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
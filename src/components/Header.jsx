import { Link, useLocation } from 'react-router-dom';
import { FaLeaf } from 'react-icons/fa';

/**
 * Component voor de navigatiebalk
 */
const Header = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Bepaal de titel op basis van het huidige pad
  const getTitle = () => {
    if (currentPath === '/') return 'Dashboard';
    if (currentPath === '/walks') return 'Wandelingen';
    if (currentPath === '/new-walk') return 'Nieuwe wandeling';
    if (currentPath.includes('/active-walk/')) return 'Actieve wandeling';
    if (currentPath.includes('/walk-summary/') || currentPath.includes('/walk/')) return 'Wandelsamenvatting';
    if (currentPath === '/profile') return 'Profiel';
    if (currentPath === '/settings') return 'Instellingen';
    return 'Wandeldagboek';
  };
  
  // Controleer of we op een actieve wandelingspagina zijn
  const isActivePage = currentPath.includes('/active-walk/');
  
  return (
    <header className="bg-primary-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo en titel */}
          <Link to="/" className="flex items-center">
            <FaLeaf className="h-6 w-6 mr-2 flex-shrink-0" />
            <span className="text-lg font-bold truncate">{getTitle()}</span>
          </Link>

          {/* Actieknoppen voor specifieke pagina's */}
          {isActivePage ? (
            <Link
              to="/"
              className="bg-primary-700 hover:bg-primary-800 px-3 py-1 rounded-md text-sm transition-colors duration-200"
            >
              Terug naar dashboard
            </Link>
          ) : (
            <a
              href="https://www.mennoenerwin.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/80 hover:text-white transition-colors duration-200 flex items-center"
            >
              <span>Door Menno & Erwin</span>
            </a>
          )}
        </div>
      </div>
      
      {/* Podcast banner */}
      <div className="bg-secondary-600 text-white text-xs py-1 text-center">
        <a 
          href="https://www.mennoenerwin.nl" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Ontdek de natuur met de Menno & Erwin podcast - Bezoek www.mennoenerwin.nl
        </a>
      </div>
    </header>
  );
};

export default Header; 
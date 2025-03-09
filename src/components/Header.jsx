import { Link, useLocation } from 'react-router-dom';

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
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo en titel */}
          <Link to="/" className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-lg font-bold truncate">{getTitle()}</span>
          </Link>

          {/* Actieknoppen voor specifieke pagina's */}
          {isActivePage && (
            <Link
              to="/"
              className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-md text-sm transition-colors duration-200"
            >
              Terug naar dashboard
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 
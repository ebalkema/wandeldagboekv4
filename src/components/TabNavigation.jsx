import { Link, useLocation } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { FaWalking } from 'react-icons/fa';
import { FaUser } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';

/**
 * Component voor tabblad-navigatie onderaan het scherm
 */
const TabNavigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Controleer of we op een actieve wandelingspagina zijn
  const isActivePage = currentPath.includes('/active-walk/');
  
  // Verberg de navigatie op actieve wandelingspagina's
  if (isActivePage) {
    return null;
  }
  
  // Bepaal welk tabblad actief is
  const isActive = (path) => {
    if (path === '/' && currentPath === '/') return true;
    if (path === '/walks' && currentPath === '/walks') return true;
    if (path === '/profile' && currentPath === '/profile') return true;
    return false;
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around items-center h-16">
        {/* Dashboard tab */}
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/') ? 'text-primary-600' : 'text-gray-500'
          }`}
        >
          <FaHome className="text-xl mb-1" />
          <span className="text-xs">Dashboard</span>
        </Link>
        
        {/* Wandelingen tab */}
        <Link 
          to="/walks" 
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/walks') ? 'text-primary-600' : 'text-gray-500'
          }`}
        >
          <FaWalking className="text-xl mb-1" />
          <span className="text-xs">Wandelingen</span>
        </Link>
        
        {/* Nieuwe wandeling knop (in het midden) */}
        <Link 
          to="/new-walk" 
          className="flex flex-col items-center justify-center w-full h-full"
        >
          <div className="bg-primary-600 text-white rounded-full p-3 mb-1 shadow-md">
            <FaPlus className="text-lg" />
          </div>
          <span className="text-xs text-gray-500">Nieuw</span>
        </Link>
        
        {/* Profiel tab */}
        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/profile') ? 'text-primary-600' : 'text-gray-500'
          }`}
        >
          <FaUser className="text-xl mb-1" />
          <span className="text-xs">Profiel</span>
        </Link>
      </div>
    </div>
  );
};

export default TabNavigation; 
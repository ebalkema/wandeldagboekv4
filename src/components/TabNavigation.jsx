import { Link, useLocation } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { FaWalking } from 'react-icons/fa';
import { FaUser } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';
import { FaPodcast } from 'react-icons/fa';
import { FaBinoculars } from 'react-icons/fa';
import { FaRoute } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

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
    if (path === '/podcast' && currentPath === '/podcast') return true;
    return false;
  };
  
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-10">
      <div className="grid grid-cols-5 h-16">
        <NavLink
          to="/"
          className={({ isActive }) => `
            flex flex-col items-center justify-center
            ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <FaHome className="text-xl mb-1" />
          <span className="text-xs">Dashboard</span>
        </NavLink>
        
        <NavLink
          to="/walks"
          className={({ isActive }) => `
            flex flex-col items-center justify-center
            ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <FaRoute className="text-xl mb-1" />
          <span className="text-xs">Wandelingen</span>
        </NavLink>
        
        <div className="flex items-center justify-center">
          <Link
            to="/new-walk"
            className="bg-primary-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transform -translate-y-5 hover:bg-primary-700 transition-colors"
          >
            <FaPlus className="text-xl" />
          </Link>
        </div>
        
        <NavLink
          to="/birding"
          className={({ isActive }) => `
            flex flex-col items-center justify-center
            ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <FaBinoculars className="text-xl mb-1" />
          <span className="text-xs">Vogels</span>
        </NavLink>
        
        <NavLink
          to="/profile"
          className={({ isActive }) => `
            flex flex-col items-center justify-center
            ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          <FaUser className="text-xl mb-1" />
          <span className="text-xs">Profiel</span>
        </NavLink>
      </div>
    </div>
  );
};

export default TabNavigation; 
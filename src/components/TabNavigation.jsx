import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { FaWalking } from 'react-icons/fa';
import { FaUser } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';
import { FaPodcast } from 'react-icons/fa';
import { FaBinoculars } from 'react-icons/fa';
import { FaRoute } from 'react-icons/fa';
import { FaLeaf } from 'react-icons/fa';
import { FaStop } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

/**
 * Component voor tabblad-navigatie onderaan het scherm
 */
const TabNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  // Controleer schermgrootte en pas aan wanneer deze verandert
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Controleer of we op een actieve wandelingspagina zijn
  const isActivePage = currentPath.includes('/active-walk/');
  
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
  
  // Verberg de navigatie op actieve wandelingspagina's
  if (isActivePage) {
    return (
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-10">
        <div className="grid grid-cols-3 h-16">
          <NavLink
            to="/"
            className="flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <FaHome className="text-xl mb-1" />
            <span className="text-xs">Home</span>
          </NavLink>
          
          <div className="flex items-center justify-center">
            <Link
              to={`/walk/${getWalkId()}`}
              className="bg-red-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transform -translate-y-5 hover:bg-red-700 transition-colors"
            >
              <FaStop className="text-xl" />
            </Link>
          </div>
          
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
  }
  
  // Bepaal welk tabblad actief is
  const isActive = (path) => {
    if (path === '/' && currentPath === '/') return true;
    if (path === '/walks' && currentPath === '/walks') return true;
    if (path === '/profile' && currentPath === '/profile') return true;
    if (path === '/podcast' && currentPath === '/podcast') return true;
    if (path === '/biodiversity' && currentPath === '/biodiversity') return true;
    return false;
  };

  // Aangepaste NavLink component met responsieve labels
  const ResponsiveNavLink = ({ to, icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center justify-center px-1
        ${isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}
      `}
    >
      {icon}
      {(!isMobile || to === '/') && <span className="text-xs mt-1">{label}</span>}
    </NavLink>
  );
  
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-10">
      <div className="flex justify-between h-16 px-1">
        <ResponsiveNavLink 
          to="/" 
          icon={<FaHome className={`${isMobile ? 'text-2xl' : 'text-xl'}`} />} 
          label="Home" 
        />
        
        <ResponsiveNavLink 
          to="/walks" 
          icon={<FaRoute className={`${isMobile ? 'text-2xl' : 'text-xl'}`} />} 
          label="Wandelingen" 
        />
        
        <div className="flex items-center justify-center mx-1">
          <Link
            to="/new-walk"
            className="bg-primary-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transform -translate-y-5 hover:bg-primary-700 transition-colors"
          >
            <FaPlus className="text-xl" />
          </Link>
        </div>
        
        <ResponsiveNavLink 
          to="/birding" 
          icon={<FaBinoculars className={`${isMobile ? 'text-2xl' : 'text-xl'}`} />} 
          label="Vogels" 
        />
        
        <ResponsiveNavLink 
          to="/biodiversity" 
          icon={<FaLeaf className={`${isMobile ? 'text-2xl' : 'text-xl'}`} />} 
          label="Natuur" 
        />
        
        <ResponsiveNavLink 
          to="/profile" 
          icon={<FaUser className={`${isMobile ? 'text-2xl' : 'text-xl'}`} />} 
          label="Profiel" 
        />
      </div>
    </div>
  );
};

export default TabNavigation; 